# MyLittleBudget

MyLittleBudget è una piccola applicazione per gestire Pocket, spese fisse ed extra, il conto e l’andamento delle uscite. L’interfaccia è pensata per telefono e desktop.

## Dati e backup

I dati finanziari vengono salvati nel browser sul dispositivo, tramite l’archiviazione locale. I backup JSON sono creati e importati manualmente dall’utente; l’app può anche salvare o ripristinare un backup nella cartella privata dell’app su Google Drive, solo su richiesta.

Il backup JSON resta compatibile con il formato esistente ed è **leggibile e non cifrato**. Proteggilo come qualsiasi documento che contiene dati finanziari. La cifratura con password potrebbe essere valutata in futuro, ma non è attualmente disponibile. Non vengono inclusi dati demo o personali nel repository.

Dopo un reset del solo grafico del conto, i backup includono il campo facoltativo `bankChartReset` (saldo di partenza e movimenti successivi al reset). I backup precedenti che non contengono il campo continuano a ricostruire il grafico da `bankHistory`; il contenitore e il protocollo del backup Google Drive restano invariati.

## Installazione come PWA

Apri MyLittleBudget in un browser compatibile tramite HTTPS (o localhost), poi scegli “Installa app” / “Aggiungi alla schermata Home” dal menu del browser. Una copia dell’interfaccia e dei file locali può essere disponibile offline dopo il primo caricamento; funzioni che dipendono da servizi online, come Google Drive e le librerie caricate da CDN, richiedono una connessione.

Gli aggiornamenti della PWA vengono applicati solo dopo aver scelto “Aggiorna” nell’avviso mostrato dall’app.
