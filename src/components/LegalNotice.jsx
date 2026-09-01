import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * LegalNotice — reusable "Copyright & Legal Notice" link + modal dialog.
 * Used in the Ligat page (inline) and the desktop Footer (bottom banner).
 */
export default function LegalNotice({
  label = 'Copyright & Legal Notice',
  className = '',
  defaultLang = 'en',
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(defaultLang);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors ${className}`}
      >
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="text-base font-bold">COPYRIGHT & LEGAL NOTICE</DialogTitle>
              <div className="flex items-center gap-1 text-[11px] border border-border rounded-full px-1.5 py-0.5">
                <button onClick={() => setLang('en')} className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'en' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>EN</button>
                <button onClick={() => setLang('sq')} className={`px-2 py-0.5 rounded-full transition-colors ${lang === 'sq' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>SQ</button>
              </div>
            </div>
          </DialogHeader>

          {lang === 'en' ? (
            <div className="text-xs text-muted-foreground space-y-4 leading-relaxed">
              <p className="text-[11px]"><em>Effective Date: 15.04.2026</em></p>
              <div>
                <p className="font-semibold text-foreground mb-1">1. Copyright</p>
                <p>© 2026 KosovoScores. All rights reserved.</p>
                <p className="mt-1">All content, features, and functionality available in the KosovoScores application, including but not limited to text, graphics, logos, icons, images, data, match statistics, software code, and design elements, are the exclusive property of KosovoScores or its licensors and are protected by applicable copyright, trademark, and intellectual property laws.</p>
                <p className="mt-1">Unauthorized copying, reproduction, distribution, modification, or public display of any part of this application without prior written permission is strictly prohibited.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">2. Trademarks</p>
                <p>"KosovoScores" and its logo are trademarks of KosovoScores. Any unauthorized use, reproduction, or imitation of these trademarks is strictly prohibited and may result in legal action.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">3. Data & Content Disclaimer</p>
                <p>KosovoScores provides live scores, match data, statistics, and related content for informational purposes only. While we strive to ensure accuracy and real-time updates, we do not guarantee the completeness, reliability, or accuracy of any information presented.</p>
                <p className="mt-1">Users acknowledge that:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Match data may be delayed or inaccurate due to third-party data sources.</li>
                  <li>KosovoScores is not responsible for decisions made based on the information provided within the app.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">4. Third-Party Services</p>
                <p>KosovoScores may use third-party APIs, services, or data providers to deliver live scores and related content. All third-party trademarks, data, and content remain the property of their respective owners.</p>
                <p className="mt-1">We are not responsible for:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Interruptions or errors caused by third-party services</li>
                  <li>Changes in third-party data availability</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">5. Limitation of Liability</p>
                <p>To the fullest extent permitted by law, KosovoScores shall not be liable for any direct, indirect, incidental, or consequential damages arising from:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Use or inability to use the application</li>
                  <li>Errors or omissions in content</li>
                  <li>Service interruptions or technical issues</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">6. User Responsibility</p>
                <p>By using KosovoScores, you agree:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Not to misuse, hack, or interfere with the app</li>
                  <li>Not to copy or redistribute app content without permission</li>
                  <li>To use the app only for lawful purposes</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">7. Changes to This Notice</p>
                <p>KosovoScores reserves the right to modify or update this Legal Notice at any time without prior notice. Continued use of the application constitutes acceptance of any changes.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">8. Contact</p>
                <p>For legal inquiries or copyright concerns, please contact:</p>
                <p className="mt-1">Email: <span className="text-primary">info@kosovoscores.com</span></p>
                <p>Website: <span className="text-primary">kosovoscores.com</span></p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground space-y-4 leading-relaxed">
              <p className="text-[11px]"><em>Data e Hyrjes në Fuqi: 15.04.2026</em></p>
              <div>
                <p className="font-semibold text-foreground mb-1">1. E drejta e autorit</p>
                <p>© 2026 KosovoScores. Të gjitha të drejtat e rezervuara.</p>
                <p className="mt-1">Të gjitha përmbajtjet, veçoritë dhe funksionalitetet e disponueshme në aplikacionin KosovoScores, duke përfshirë por pa u kufizuar në tekste, grafika, logoja, ikona, imazhe, të dhëna, statistika ndeshjesh, kod softuerik dhe elemente dizajni, janë pronë ekskluzive e KosovoScores ose licencuesve të tij dhe mbrohen nga ligjet e aplikueshme të të drejtave të autorit, markave tregtare dhe pronësisë intelektuale.</p>
                <p className="mt-1">Kopjimi, riprodhimi, shpërndarja, modifikimi ose shfaqja publike e paautorizuar e çdo pjese të këtij aplikacioni pa leje të shkruar paraprake është rreptësisht e ndaluar.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">2. Markat tregtare</p>
                <p>"KosovoScores" dhe logoja e tij janë marka tregtare të KosovoScores. Çdo përdorim, riprodhim ose imitim i paautorizuar i këtyre markave është rreptësisht i ndaluar dhe mund të rezultojë në veprime ligjore.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">3. Mohim i të dhënave dhe përmbajtjes</p>
                <p>KosovoScores ofron rezultate live, të dhëna ndeshjesh, statistika dhe përmbajtje të ngjashme vetëm për qëllime informuese. Edhe pse përpiqemi të sigurojmë saktësi dhe përditësime në kohë reale, nuk garantojmë plotësinë, besueshmërinë ose saktësinë e asnjë informacioni të paraqitur.</p>
                <p className="mt-1">Përdoruesit pranojnë se:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Të dhënat e ndeshjeve mund të vonohen ose të jenë të pasakta për shkak të burimeve të palëve të treta.</li>
                  <li>KosovoScores nuk është përgjegjës për vendimet e marra bazuar në informacionin e ofruar brenda aplikacionit.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">4. Shërbimet e palëve të treta</p>
                <p>KosovoScores mund të përdorë API-të, shërbimet ose ofruesit e të dhënave të palëve të treta për të ofruar rezultate live dhe përmbajtje të ngjashme. Të gjitha markat tregtare, të dhënat dhe përmbajtjet e palëve të treta mbeten pronë e pronarëve të tyre përkatës.</p>
                <p className="mt-1">Ne nuk jemi përgjegjës për:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Ndërprerjet ose gabimet e shkaktuara nga shërbimet e palëve të treta</li>
                  <li>Ndryshimet në disponueshmërinë e të dhënave të palëve të treta</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">5. Kufizimi i përgjegjësisë</p>
                <p>Në masën më të plotë të lejuar nga ligji, KosovoScores nuk do të jetë përgjegjës për asnjë dëm direkt, indirekt, aksidental ose pasojues që lind nga:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Përdorimi ose pamundësia për të përdorur aplikacionin</li>
                  <li>Gabimet ose boshllëqet në përmbajtje</li>
                  <li>Ndërprerjet e shërbimit ose çështjet teknike</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">6. Përgjegjësia e përdoruesit</p>
                <p>Duke përdorur KosovoScores, ju pranoni:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Të mos keqpërdorni, hakoni ose ndërhyni në aplikacion</li>
                  <li>Të mos kopjoni ose rishpërndani përmbajtjen e aplikacionit pa leje</li>
                  <li>Të përdorni aplikacionin vetëm për qëllime ligjore</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">7. Ndryshimet në këtë njoftim</p>
                <p>KosovoScores rezervon të drejtën për të modifikuar ose përditësuar këtë Njoftim Ligjor në çdo kohë pa njoftim paraprak. Përdorimi i vazhdueshëm i aplikacionit përbën pranimin e çdo ndryshimi.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">8. Kontakti</p>
                <p>Për pyetje ligjore ose shqetësime të të drejtave të autorit, ju lutemi kontaktoni:</p>
                <p className="mt-1">Email: <span className="text-primary">info@kosovoscores.com</span></p>
                <p>Faqja web: <span className="text-primary">kosovoscores.com</span></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}