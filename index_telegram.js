const axios = require('axios');
const fs = require('fs').promises;
const random = require('lodash/random');
const winston = require('winston');

// Configurazione del logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} - ${level}: ${message}`)
    ),
    transports: [new winston.transports.Console()],
});

class AmazonScraper {
    constructor(filterConfigPath, dataConfigPath, proxies = [], telegramBotToken, telegramChatId) {
        this.loadConfigurations(filterConfigPath, dataConfigPath);
        this.setupClients(proxies);
        this.telegramBotToken = telegramBotToken;
        this.telegramChatId = telegramChatId;
        this.age = 'false';  // "true" per vecchio, "false" per nuovo
        this.setupMappingsAndHeaders();
        this.setupValidation();
    }

    async loadConfigurations(filterConfigPath, dataConfigPath) {
        if (!filterConfigPath || !dataConfigPath) {
            throw new Error('Config files not found');
        }

        if (!filterConfigPath.endsWith('.json') || !dataConfigPath.endsWith('.json')) {
            throw new Error('Config files must have a .json extension');
        }

        try {
            const filterConfig = await fs.readFile(filterConfigPath, 'utf-8');
            this.filterConfig = JSON.parse(filterConfig);

            const alreadySeen = await fs.readFile(dataConfigPath, 'utf-8');
            this.alreadySeen = JSON.parse(alreadySeen);
        } catch (err) {
            throw new Error('Failed to load config files. Make sure they contain valid JSON data.');
        }
    }

    setupClients(proxies) {
        this.clients = proxies.map(proxy => axios.create({
            proxy: {
                host: proxy.split('@')[1].split(':')[0],
                port: proxy.split('@')[1].split(':')[1],
                auth: {
                    username: proxy.split('@')[0].split(':')[0],
                    password: proxy.split('@')[0].split(':')[1],
                },
            },
            timeout: 10000,
        }));
    }

    setupMappingsAndHeaders() {
        this.mappings = {
            "Contains All Details": "flex flex-row gap-[12px] flex-wrap justify-center items-center",
            "Price": "h-[28px] absolute top-[5px] left-[10px] w-[76px] px-4 text-white text-base flex flex-row items-center justify-center bg-black rounded-full",
            "Title": "text-black text-base text-center overflow-hidden h-[48px] whitespace-normal break-words",
            "Average Price": "flex border border-black/10 bg-white px-3 py-1 rounded-[6px] flex-row items-center gap-x-3",
            "Amazon Link": "bg-gradient-to-b from-[#EFDC9E] to-[#E5C762] font-semibold border border-black/30 text-[12px] w-[231px] h-[31px] rounded-[6px] flex flex-col items-center justify-center text-black mt-[14px] mb-[8px]",
        };

        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'RSC': '1',
            'Next-Url': '/top',
            'DNT': '1',
            'Sec-GPC': '1',
            'Connection': 'keep-alive',
            'Referer': 'https://saving.deals/top',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Priority': 'u=0',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
        };
    }

    setupValidation() {
        this.validateKeys = {
            array: ['other_webhook', 'price_off', 'priority_category', 'regular_category', 'categories', 'webhook', 'filters', 'webhooks'],
            number: ['average_price_min', 'average_price_max', 'percent_off_min', 'percent_off_max', 'color'],
            boolean: ['priority', 'isolated'],
            string: ['name', 'role', 'username', 'avatar_url', 'author_name', 'author_icon_url', 'footer', 'footer_icon'],
            object: ['criteria', 'embed_data'],
        };

        this.requiredKeys = ['other_webhook', 'price_off', 'priority_category', 'regular_category', 'filters'];
        this.foundKeys = Object.fromEntries(Object.values(this.validateKeys).flat().map(key => [key, false]));

        try {
            this.validateConfig();
        } catch (err) {
            throw new Error(`You have a corrupt configuration: ${err}`);
        }

        for (const key of this.requiredKeys) {
            if (!this.foundKeys[key]) {
                throw new Error(`Required key '${key}' not found in config`);
            }
        }

        logger.info('Config validated!');
    }

    validateConfig() {
        for (const [key, value] of Object.entries(this.filterConfig)) {
            this.validate(key, value);
        }
    }

    validate(key, value) {
        const type = Array.isArray(value) ? 'array' : typeof value;
        if (!this.validateKeys[type]) {
            throw new Error(`Invalid key: ${key} with value: ${value}`);
        }

        if (type === 'object') {
            for (const [k, v] of Object.entries(value)) {
                this.validate(k, v);
            }
        }

        if (type === 'array') {
            for (const item of value) {
                if (typeof item === 'object') {
                    for (const [k, v] of Object.entries(item)) {
                        this.validate(k, v);
                    }
                }
            }
        }

        if (!this.validateKeys[type].includes(key)) {
            throw new Error(`Key '${key}' not found in ${this.validateKeys[type]}`);
        }

        if (type === 'object' && value.webhook && !value.webhook.startsWith('https://discord.com/api/webhooks/')) {
            throw new Error(`Invalid webhook: ${value.webhook}`);
        }

        if (type === 'object' && !value.role) {
            throw new Error(`Role not found in ${value}`);
        }

        this.foundKeys[key] = true;
    }

    async makeRequest(method, url, headers, jsonData = null, retries = 5) {
        try {
            const client = this.clients[random(0, this.clients.length - 1)];
            const response = await client({
                method,
                url,
                headers,
                data: jsonData,
            });

            return response;
        } catch (err) {
            if (retries > 0) {
                logger.warn(`Retrying: ${url} (${retries} attempts left)`);
                return this.makeRequest(method, url, headers, jsonData, retries - 1);
            } else {
                throw err;
            }
        }
    }

    async matchFilter(data) {
        const matchingWebhooks = [];
        const currentPrice = data.offerPrice;
        const avgPrice = data.average;
        const percentOff = ((avgPrice - currentPrice) / avgPrice) * 100;
        let hasBeenIsolated = false;
        const isolatedWebhooks = [];

        for (const filter of this.filterConfig.filters) {
            let match = true;
            const criteria = filter.criteria;

            if (hasBeenIsolated) match = false;
            if (criteria.average_price_min && avgPrice < criteria.average_price_min) match = false;
            if (criteria.average_price_max && avgPrice > criteria.average_price_max) match = false;
            if (criteria.percent_off_min && percentOff < criteria.percent_off_min) match = false;
            if (criteria.percent_off_max && percentOff > criteria.percent_off_max) match = false;

            if (criteria.categories && !criteria.categories.includes(data.categories)) {
                if (!criteria.categories.includes('all')) match = false;
            }

            if (filter.isolated && !hasBeenIsolated) hasBeenIsolated = true;

            if (match) {
                if (filter.isolated) isolatedWebhooks.push(...filter.webhooks);
                else matchingWebhooks.push(...filter.webhooks);
            }
        }

        return isolatedWebhooks.length ? isolatedWebhooks : matchingWebhooks;
    }

    async postTelegramMessage(data) {
        try {
            const currentPrice = `$${data.offerPrice.toFixed(2)}`;
            const avgPrice = `$${data.average.toFixed(2)}`;
            const amtOff = data.average - data.offerPrice;
            const percentOff = `${((amtOff / data.average) * 100).toFixed(3)}%`;

            const message = `
<strong>${data.title}</strong>
<a href="https://www.amazon.com/dp/${data.asin}">Link all'offerta</a>

💰 Prezzo precedente: ${avgPrice}
💸 Nuovo prezzo: ${currentPrice}
🤑 Sconto: ${percentOff}
`;

            const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
            const payload = {
                chat_id: this.telegramChatId,
                text: message,
                parse_mode: 'HTML'
            };

            const response = await axios.post(url, payload);

            if (response.status !== 200) {
                logger.error(`Failed to send message to Telegram: ${response.status} - ${response.data}`);
            }
        } catch (err) {
            logger.error(`Failed to create message payload: ${err}`);
        }
    }

    async getDeals(category, price, age, page) {
        const url = `https://saving.deals/top?page=${page}&age=${age}&off=${price}&categories=${category}`;
        logger.debug(`Requesting: ${url}`);

        const response = await this.makeRequest('get', url, this.headers);
        return response.data;
    }

    async parseDeals(resp) {
        try {
            return JSON.parse(resp.split(']\n2:')[1])[3].initialData;
        } catch (err) {
            logger.error(`Failed to parse deals: ${resp}`);
            return [];
        }
    }

    async saveRegularly() {
        setInterval(async () => {
            try {
                await fs.writeFile('data.json', JSON.stringify(this.alreadySeen, null, 4));
            } catch (err) {
                logger.error(`Failed to save data: ${err}`);
            }
        }, 10000);
    }

    async handleTask(category, price, age, priority) {
        if (priority) {
            await new Promise(resolve => setTimeout(resolve, random(500, 1000)));
        } else {
            await new Promise(resolve => setTimeout(resolve, random(1000, 5000)));
        }

        const deals = await this.getDeals(category, price, age, 1);
        if (!deals) {
            logger.info(`No deals found for category ${category} with price off ${price}%`);
            return;
        }

        const parsedDeals = await this.parseDeals(deals);
        for (const deal of parsedDeals) {
            if (this.alreadySeen.includes(deal._id)) continue;

            this.alreadySeen.push(deal._id);
            deal.categories = [category];

            await this.postTelegramMessage(deal);
        }
    }

    async priorityTasks() {
        while (true) {
            const tasks = [];
            for (const category of this.filterConfig.priority_category) {
                for (const price of this.filterConfig.price_off) {
                    tasks.push(this.handleTask(category, price, this.age, true));
                }
            }
            await Promise.all(tasks);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async regularTasks() {
        await new Promise(resolve => setTimeout(resolve, 10000));
        while (true) {
            const tasks = [];
            for (const category of this.filterConfig.regular_category) {
                for (const price of this.filterConfig.price_off) {
                    tasks.push(this.handleTask(category, price, this.age, false));
                }
            }
            await Promise.all(tasks);
            await new Promise(resolve => setTimeout(resolve, 63000));
        }
    }

    async main() {
        this.saveRegularly();

        await Promise.all([this.priorityTasks(), this.regularTasks()]);
    }
}

(async () => {
    const configJson = 'config.json';
    const dataJson = 'data.json';
    const proxies = ['http://username:password@ip:port', 'http://username:password@ip:port'];
    const telegramBotToken = 'your-telegram-bot-token';
    const telegramChatId = 'your-telegram-chat-id';

    const scraper = new AmazonScraper(configJson, dataJson, proxies, telegramBotToken, telegramChatId);
    await scraper.main();
})();
