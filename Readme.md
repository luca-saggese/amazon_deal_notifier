Ecco il README aggiornato per il progetto, adattato per Node.js:

# Amazon-Deal-Monitor

**Questo progetto è destinato esclusivamente a scopi educativi. Gli autori non sono responsabili per un uso improprio del software. Gli utenti sono unicamente responsabili di garantire che il loro uso sia conforme alle leggi applicabili e ai termini di servizio dei siti web coinvolti.**

Amazon Deal Monitor recupera offerte da una fonte di terze parti e le pubblica su webhook Discord in base a filtri e categorie configurabili. Questo strumento è progettato per essere modulare, con configurazioni basate su file JSON e funzionalità avanzate di filtraggio delle offerte.

![88n131Jkrh](https://github.com/user-attachments/assets/8e554ee2-ec89-41d5-b5bc-4b3983bf9c31)
![olgGOAh553](https://github.com/user-attachments/assets/7667d984-5079-4c6a-9977-bc4c985e6be5)
![XaHOKnsOA1](https://github.com/user-attachments/assets/b3a400a1-33a6-4e47-a4de-b9b38e7acf4e)

## Funzionalità

- Completamente asincrono per una gestione efficiente.
- Recupera offerte da Amazon basate su categorie e sconti definiti.
- Pubblica offerte su webhook Discord con dati personalizzabili nell'embed.
- Supporta configurazioni proxy multiple per la gestione delle richieste.
- Valida e carica le configurazioni di filtri e dati dai file JSON.
- Fornisce task programmati per il recupero di offerte regolari e prioritarie.

## Installazione

1. **Clonare il repository:**

    ```bash
    git clone https://github.com/ArshansGithub/Amazon-Deal-Monitor.git
    cd Amazon-Deal-Monitor
    ```

2. **Installare le dipendenze:**

    ```bash
    npm install
    ```

3. **Creare i file di configurazione:**

    - `config.json`: Configura filtri, dettagli dei webhook e dati degli embed.
    - `data.json`: *NON MODIFICARE!* -> Tiene traccia delle offerte già viste per evitare duplicazioni.

    *Esempi di `config.json` e `data.json` sono forniti sotto.*

## Configurazione

### `config.json`

```json
{
    "priority_category": ["Electronics"],
    "regular_category": [
        "Arts Crafts and Sewing",
        "Baby Products",
        "Beauty",
        "Collectibles and Fine Art",
        "Furniture",
        "Grocery and Gourmet Food",
        "Health and Personal Care",
        "Home and Kitchen",
        "Jewelry",
        "Kindle Store",
        "Luggage",
        "Movies and TV",
        "Music",
        "Musical Instruments",
        "Office Products",
        "Other",
        "Patio Lawn and Garden",
        "Pet Supplies",
        "Sports and Outdoors",
        "Toys and Games",
        "Video Games",
        "Automotive",
        "Cell Phones and Accessories",
        "Industrial and Scientific",
        "Tools and Home Improvement",
        "Appliances"
    ],
    "price_off": [10, 20, 30],
    "other_webhook": "https://discord.com/api/webhooks/your-webhook-url",
    "filters": [
        {
            "criteria": {
                "average_price_min": 10,
                "average_price_max": 100,
                "percent_off_min": 10,
                "percent_off_max": 50,
                "categories": ["category1", "all"]
            },
            "webhooks": [
                {
                    "webhook": ["https://discord.com/api/webhooks/your-webhook-url"],
                    "role": "your-role-id"
                }
            ],
            "isolated": true
        }
    ],
    "embed_data": {
        "username": "Amazon Deals Bot",
        "avatar_url": "https://example.com/avatar.png",
        "author_name": "Amazon Deals",
        "author_icon_url": "https://example.com/author-icon.png",
        "footer": "Happy Shopping!",
        "footer_icon": "https://example.com/footer-icon.png",
        "color": 16711680
    }
}
```

### `data.json`

```json
[]
```

## Utilizzo

### Avvio dello Scraper

Per avviare lo scraper, usa il seguente comando:

```bash
node main.js
```

### Personalizzazione di Filtri e Webhook

Puoi modificare i criteri dei filtri e le configurazioni dei webhook nel file `config.json`. Assicurati che la struttura del JSON sia valida e includa tutti i campi richiesti.

- Il flag `isolated` su ciascun filtro dà priorità a quel filtro, il che significa che verrà restituito esclusivamente se corrisponde. Posiziona i filtri nell'ordine desiderato per controllare l'output dei risultati. Ad esempio, se due filtri con il flag `isolated` sono vicini, verrà restituito solo il primo filtro corrispondente.

- I filtri che fanno riferimento al "prezzo medio" si riferiscono al prezzo del prodotto prima dell'applicazione di eventuali sconti.

## Test

Amazon Deal Monitor include test unitari per garantire il corretto funzionamento dei suoi componenti, in particolare della classe `AmazonScraper` e della sua logica di filtraggio.

### Come Eseguire i Test

1. **Navigare nella directory dei test:**

   Vai nella directory in cui si trova il tuo script di test.

   ```bash
   cd tests
   ```

2. **Eseguire i test:**

   Esegui lo script di test usando Node.js:

   ```bash
   npm test
   ```

## Contributi

I contributi sono benvenuti! Per contribuire al progetto, effettua un fork del repository e usa branch dedicati per le nuove funzionalità. Invia pull request per la revisione e l'inclusione.

## Licenza

Questo progetto è concesso in licenza sotto la GNU General Public License.

## Contatti

Per domande o supporto, apri un ticket sulla [pagina GitHub issues](https://github.com/ArshansGithub/Amazon-Deal-Monitor/issues).
