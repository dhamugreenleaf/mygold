import React, { useState, useEffect } from 'react';
import { FiX, FiFileText, FiInfo } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

const TERMS_DATA = {
  en: {
    label: 'English',
    sectionTitle: 'Disclaimer',
    paragraphs: [
      'MyGold is an informational application for tracking gold and silver assets and viewing approximate reference prices.',
      'MyGold does not buy, sell, or facilitate the buying or selling of gold, silver, money, or other financial assets.',
      'Prices shown in the application are approximate reference prices only and may differ from actual market prices, jeweller prices, or prices available at your location.',
      'Users should independently verify the actual price before making any purchase or sale.',
    ],
    highlight: 'MyGold is not a platform for buying or selling gold or money.',
    footerNotice: 'I understand that MyGold provides approximate reference prices only.',
    closeBtn: 'Close',
  },
  ta: {
    label: 'தமிழ்',
    sectionTitle: 'மறுப்பு அறிவிப்பு',
    paragraphs: [
      'MyGold என்பது தங்கம் மற்றும் வெள்ளி சொத்துகளை கண்காணிக்கவும், தோராயமான குறிப்பு விலைகளை அறியவும் மட்டுமே பயன்படும் ஒரு தகவல் சார்ந்த செயலி.',
      'MyGold மூலம் தங்கம், வெள்ளி, பணம் அல்லது பிற நிதி சொத்துகளை வாங்கவோ, விற்கவோ அல்லது வாங்குதல்/விற்பனையை ஏற்பாடு செய்யவோ எந்த சேவையும் வழங்கப்படுவதில்லை.',
      'செயலியில் காட்டப்படும் விலைகள் தோராயமான குறிப்பு விலைகள் மட்டுமே. உண்மையான சந்தை விலை, நகைக்கடை விலை அல்லது உங்கள் இருப்பிடத்தில் கிடைக்கும் விலை மாறுபடலாம்.',
      'வாங்குதல் அல்லது விற்பனை செய்வதற்கு முன், உண்மையான விலையை தனியாக சரிபார்த்துக் கொள்ள வேண்டும்.',
    ],
    highlight: 'MyGold தங்கம் அல்லது பணத்தை வாங்குவதற்கும் விற்பதற்குமான தளம் அல்ல.',
    footerNotice: 'MyGold தோராயமான குறிப்பு விலைகளை மட்டுமே வழங்குகிறது என்பதை நான் புரிந்துகொள்கிறேன்.',
    closeBtn: 'மூடு',
  },
  hi: {
    label: 'हिन्दी',
    sectionTitle: 'अस्वीकरण',
    paragraphs: [
      'MyGold सोने और चांदी की संपत्तियों को ट्रैक करने और अनुमानित संदर्भ कीमतें देखने के लिए बनाया गया एक सूचना-आधारित ऐप है।',
      'MyGold सोना, चांदी, पैसा या अन्य वित्तीय संपत्तियों को खरीदता, बेचता या उनकी खरीद-बिक्री की सुविधा प्रदान नहीं करता है।',
      'ऐप में दिखाई गई कीमतें केवल अनुमानित संदर्भ कीमतें हैं। वास्तविक बाजार कीमत, ज्वेलर की कीमत या आपके स्थान पर उपलब्ध कीमत अलग हो सकती है।',
      'किसी भी खरीद या बिक्री से पहले वास्तविक कीमत की स्वतंत्र रूप से पुष्टि करें।',
    ],
    highlight: 'MyGold सोना या पैसा खरीदने या बेचने का प्लेटफ़ॉर्म नहीं है।',
    footerNotice: 'मैं समझता/समझती हूँ कि MyGold केवल अनुमानित संदर्भ कीमतें प्रदान करता है।',
    closeBtn: 'बंद करें',
  },
  ml: {
    label: 'മലയാളം',
    sectionTitle: 'നിരാകരണ അറിയിപ്പ്',
    paragraphs: [
      'MyGold സ്വർണ്ണവും വെള്ളിയും സംബന്ധിച്ച ആസ്തികൾ ട്രാക്ക് ചെയ്യുന്നതിനും ഏകദേശ റഫറൻസ് വിലകൾ കാണുന്നതിനുമുള്ള ഒരു വിവരാധിഷ്ഠിത ആപ്ലിക്കേഷനാണ്.',
      'MyGold സ്വർണ്ണം, വെള്ളി, പണം അല്ലെങ്കിൽ മറ്റ് സാമ്പത്തിക ആസ്തികൾ വാങ്ങുകയോ വിൽക്കുകയോ അവയുടെ വാങ്ങൽ/വിൽപ്പനയ്ക്ക് സൗകര്യം ഒരുക്കുകയോ ചെയ്യുന്നില്ല.',
      'ആപ്പിൽ കാണിക്കുന്ന വിലകൾ ഏകദേശ റഫറൻസ് വിലകൾ മാത്രമാണ്. യഥാർത്ഥ വിപണി വില, ജ്വല്ലറി വില, അല്ലെങ്കിൽ നിങ്ങളുടെ പ്രദേശത്തെ വില എന്നിവ വ്യത്യാസപ്പെട്ടേക്കാം.',
      'വാങ്ങുകയോ വിൽക്കുകയോ ചെയ്യുന്നതിന് മുമ്പ് യഥാർത്ഥ വില സ്വതന്ത്രമായി പരിശോധിക്കുക.',
    ],
    highlight: 'MyGold സ്വർണ്ണമോ പണമോ വാങ്ങുന്നതിനോ വിൽക്കുന്നതിനോ ഉള്ള പ്ലാറ്റ്ഫോം അല്ല.',
    footerNotice: 'MyGold ഏകദേശ റഫറൻസ് വിലകൾ മാത്രമാണ് നൽകുന്നത് എന്ന് ഞാൻ മനസ്സിലാക്കുന്നു.',
    closeBtn: 'അടയ്ക്കുക',
  },
  te: {
    label: 'తెలుగు',
    sectionTitle: 'నిరాకరణ ప్రకటన',
    paragraphs: [
      'MyGold బంగారం మరియు వెండి ఆస్తులను ట్రాక్ చేయడానికి మరియు సుమారు సూచన ధరలను చూడడానికి ఉపయోగించే సమాచార ఆధారిత అప్లికేషన్.',
      'MyGold బంగారం, వెండి, డబ్బు లేదా ఇతర ఆర్థిక ఆస్తులను కొనుగోలు చేయదు, విక్రయించదు లేదా వాటి కొనుగోలు/విక్రయానికి సౌకర్యం కల్పించదు.',
      'యాప్లో చూపించే ధరలు సుమారు సూచన ధరలు మాత్రమే. వాస్తవ మార్కెట్ ధర, జువెలర్ ధర లేదా మీ ప్రాంతంలో లభించే ధర భిన్నంగా ఉండవచ్చు.',
      'ఏదైనా కొనుగోలు లేదా విక్రయానికి ముందు వాస్తవ ధరను స్వతంత్రంగా నిర్ధారించుకోండి.',
    ],
    highlight: 'MyGold బంగారం లేదా డబ్బును కొనుగోలు చేయడానికి లేదా విక్రయించడానికి ఉపయోగించే ప్లాట్ఫారమ్ కాదు.',
    footerNotice: 'MyGold సుమారు సూచన ధరలను మాత్రమే అందిస్తుందని నేను అర్థం చేసుకున్నాను.',
    closeBtn: 'మూసివేయి',
  },
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'te', name: 'తెలుగు' },
];

export const TermsModal = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(language || 'en');

  useEffect(() => {
    if (isOpen && language && TERMS_DATA[language]) {
      setSelectedLang(language);
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  const currentContent = TERMS_DATA[selectedLang] || TERMS_DATA.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--bg-card)] dark:bg-[#0E1526] border border-[var(--border-color)] dark:border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(245,158,11,0.2)] p-6 sm:p-7 text-[var(--text-primary)] dark:text-white overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close X Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--bg-subtle)] dark:hover:bg-white/10 transition-colors cursor-pointer z-20"
          title="Close"
          aria-label="Close Terms & Conditions"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 relative z-10 shrink-0 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-[var(--gold-1)]/30 dark:bg-amber-500/20 text-[var(--text-gold)] dark:text-amber-400 flex items-center justify-center shrink-0">
            <FiFileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black font-heading tracking-tight text-[var(--text-primary)] dark:text-white">
              Terms & Conditions
            </h3>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400">
              MyGold • Legal & Disclaimer Notice
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="mb-3 relative z-10 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                      : 'bg-[var(--bg-subtle)] dark:bg-slate-800/80 text-[var(--text-secondary)] dark:text-slate-300 hover:text-[var(--text-primary)] dark:hover:text-white border border-[var(--border-color)] dark:border-slate-700/60'
                  }`}
                >
                  {lang.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="my-2 overflow-y-auto pr-1 space-y-3.5 flex-1 relative z-10 text-xs sm:text-sm text-[var(--text-primary)] dark:text-slate-200 leading-relaxed font-medium">
          <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] dark:bg-slate-900/70 border border-[var(--border-color)] dark:border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-gold)] dark:text-amber-400">
              {currentContent.sectionTitle}
            </h4>
            
            {currentContent.paragraphs.map((p, idx) => (
              <p key={idx} className="text-slate-700 dark:text-slate-300">
                {p}
              </p>
            ))}

            <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-[var(--text-primary)] dark:text-amber-300 font-bold text-xs">
              {currentContent.highlight}
            </div>
          </div>
        </div>

        {/* Footer Notice & Close Button */}
        <div className="pt-3 relative z-10 shrink-0 space-y-3 border-t border-[var(--border-color)] dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] dark:text-slate-400 font-medium">
            <FiInfo className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{currentContent.footerNotice}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-5 rounded-2xl bg-[var(--bg-subtle)] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[var(--text-primary)] dark:text-white font-bold text-sm transition-all border border-[var(--border-color)] dark:border-slate-700 cursor-pointer"
          >
            {currentContent.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TermsModal;
