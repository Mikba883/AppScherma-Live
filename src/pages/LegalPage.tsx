import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Cookie } from 'lucide-react';

const LegalPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto p-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna indietro
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Informazioni Legali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </TabsTrigger>
                <TabsTrigger value="terms" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Termini e Condizioni
                </TabsTrigger>
                <TabsTrigger value="cookies" className="flex items-center gap-2">
                  <Cookie className="h-4 w-4" />
                  Cookie Policy
                </TabsTrigger>
              </TabsList>

              <TabsContent value="privacy" className="mt-6 space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
                  
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground italic">
                      ⚠️ Questo è un testo placeholder. Consultare un legale per il testo definitivo conforme al GDPR.
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold mt-6 mb-3">1. Titolare del Trattamento</h3>
                  <p>
                    Il Titolare del trattamento dei dati personali è [Nome Palestra/Società], con sede legale in [Indirizzo].
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">2. Dati Raccolti</h3>
                  <p>Raccogliamo le seguenti tipologie di dati personali:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Dati anagrafici (nome, cognome, data di nascita, genere)</li>
                    <li>Dati di contatto (email)</li>
                    <li>Dati relativi all'attività sportiva (turno, ruolo, statistiche assalti)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">3. Finalità del Trattamento</h3>
                  <p>I dati personali vengono trattati per le seguenti finalità:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Gestione dell'iscrizione e dell'account utente</li>
                    <li>Organizzazione delle attività sportive</li>
                    <li>Tracciamento delle prestazioni sportive</li>
                    <li>Comunicazioni relative all'attività della palestra</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">4. Base Giuridica</h3>
                  <p>
                    Il trattamento dei dati è basato sul consenso dell'interessato e sull'esecuzione del contratto di iscrizione.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">5. Conservazione dei Dati</h3>
                  <p>
                    I dati personali saranno conservati per il tempo necessario al raggiungimento delle finalità sopra indicate e comunque per non oltre 10 anni dalla cessazione del rapporto.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">6. Diritti dell'Interessato</h3>
                  <p>L'interessato ha diritto di:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Accedere ai propri dati personali</li>
                    <li>Richiedere la rettifica o la cancellazione</li>
                    <li>Richiedere la limitazione del trattamento</li>
                    <li>Opporsi al trattamento</li>
                    <li>Revocare il consenso in qualsiasi momento</li>
                    <li>Proporre reclamo all'Autorità Garante</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">7. Minori</h3>
                  <p>
                    Per i minori di 18 anni, il trattamento dei dati personali richiede il consenso dei genitori o di chi esercita la responsabilità genitoriale.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="terms" className="mt-6 space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4">Termini e Condizioni d'Uso</h2>
                  
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground italic">
                      ⚠️ Questo è un testo placeholder. Consultare un legale per il testo definitivo.
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold mt-6 mb-3">1. Oggetto</h3>
                  <p>
                    I presenti Termini e Condizioni regolano l'utilizzo della piattaforma En Garde per la gestione delle attività sportive di scherma.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">2. Registrazione</h3>
                  <p>
                    Per utilizzare la piattaforma è necessario registrarsi fornendo dati veritieri e completi. 
                    L'utente è responsabile della custodia delle proprie credenziali di accesso.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">3. Utilizzo del Servizio</h3>
                  <p>L'utente si impegna a:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Utilizzare la piattaforma in modo corretto e lecito</li>
                    <li>Non divulgare informazioni false o fuorvianti</li>
                    <li>Rispettare gli altri utenti e le norme di comportamento</li>
                    <li>Non utilizzare la piattaforma per scopi illeciti</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">4. Responsabilità</h3>
                  <p>
                    La piattaforma fornisce uno strumento di gestione e tracciamento delle attività sportive. 
                    Il gestore della piattaforma non è responsabile per l'accuratezza dei dati inseriti dagli utenti.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">5. Proprietà Intellettuale</h3>
                  <p>
                    Tutti i contenuti della piattaforma (testi, grafica, logo, icone) sono di proprietà esclusiva 
                    del gestore o dei rispettivi proprietari e sono protetti dalle leggi sul diritto d'autore.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">6. Modifiche</h3>
                  <p>
                    Il gestore si riserva il diritto di modificare i presenti Termini e Condizioni in qualsiasi momento. 
                    Le modifiche saranno comunicate agli utenti tramite email o notifica sulla piattaforma.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">7. Risoluzione</h3>
                  <p>
                    L'utente può cessare l'utilizzo del servizio in qualsiasi momento. 
                    Il gestore si riserva il diritto di sospendere o chiudere account che violano i presenti Termini e Condizioni.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">8. Legge Applicabile</h3>
                  <p>
                    I presenti Termini e Condizioni sono regolati dalla legge italiana. 
                    Per qualsiasi controversia sarà competente il Foro di [Città].
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="cookies" className="mt-6 space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h2 className="text-2xl font-bold mb-4">Cookie Policy</h2>
                  
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground italic">
                      ⚠️ Questo è un testo placeholder. Consultare un legale per il testo definitivo conforme al GDPR.
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold mt-6 mb-3">1. Cosa sono i Cookie</h3>
                  <p>
                    I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell'utente 
                    durante la navigazione su un sito web. Consentono al sito di ricordare le preferenze 
                    dell'utente e migliorare l'esperienza di navigazione.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">2. Tipologie di Cookie Utilizzati</h3>
                  
                  <h4 className="text-lg font-semibold mt-4 mb-2">Cookie Tecnici (Necessari)</h4>
                  <p>
                    Questi cookie sono essenziali per il funzionamento del sito e non possono essere disabilitati:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Cookie di autenticazione:</strong> per mantenere l'utente autenticato durante la sessione</li>
                    <li><strong>Cookie di sicurezza:</strong> per garantire la sicurezza delle transazioni</li>
                  </ul>

                  <h4 className="text-lg font-semibold mt-4 mb-2">Cookie Funzionali</h4>
                  <p>
                    Questi cookie consentono al sito di ricordare le scelte effettuate dall'utente:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Preferenze di lingua</li>
                    <li>Impostazioni di visualizzazione</li>
                    <li>Preferenze di tema (chiaro/scuro)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3">3. Gestione dei Cookie</h3>
                  <p>
                    L'utente può gestire le preferenze relative ai cookie attraverso le impostazioni del proprio browser. 
                    Si noti che la disabilitazione di alcuni cookie potrebbe limitare le funzionalità del sito.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">4. Cookie di Terze Parti</h3>
                  <p>
                    Il sito potrebbe utilizzare servizi di terze parti che installano cookie sul dispositivo dell'utente. 
                    Questi servizi sono soggetti alle rispettive privacy policy.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3">5. Durata dei Cookie</h3>
                  <p>
                    I cookie utilizzati hanno durate diverse:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Cookie di sessione:</strong> vengono eliminati alla chiusura del browser</li>
                    <li><strong>Cookie persistenti:</strong> rimangono memorizzati per un periodo determinato</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LegalPage;
