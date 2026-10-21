import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { FiShield, FiCheck } from 'react-icons/fi';

const DISCLAIMER_DATA = {
  en: {
    label: 'English',
    title: 'Disclaimer',
    text: 'MyGold is for gold and silver asset tracking and approximate price reference only. It does not buy, sell, or facilitate the buying or selling of gold, silver, money, or other financial assets. Prices shown are approximate and may differ from actual market prices.',
    agreeText: 'I understand and agree to the above disclaimer.',
    continueBtn: 'Continue',
  },
  ta: {
    label: 'தமிழ்',
    title: 'பொறுப்புத் துறப்பு',
    text: 'MyGold தங்கம் மற்றும் வெள்ளி சொத்துகளை கண்காணிக்கவும், தோராயமான விலையை அறியவும் மட்டுமே பயன்படும். இது தங்கம், வெள்ளி, பணம் அல்லது பிற நிதி சொத்துகளை வாங்கவோ விற்கவோ சேவை வழங்காது. காட்டப்படும் விலைகள் தோராயமானவை; உண்மையான சந்தை விலை மாறுபடலாம்.',
    agreeText: 'மேற்கண்ட பொறுப்புத் துறப்பை நான் படித்து ஏற்றுக்கொள்கிறேன்.',
    continueBtn: 'தொடரவும்',
  },
  hi: {
    label: 'हिन्दी',
    title: 'अस्वीकरण',
    text: 'MyGold केवल सोने और चांदी की संपत्तियों को ट्रैक करने और अनुमानित कीमत जानने के लिए है। यह सोना, चांदी, पैसा या अन्य वित्तीय संपत्तियों को खरीदने या बेचने की सुविधा या सेवा प्रदान नहीं करता है। दिखाई गई कीमतें अनुमानित हैं और वास्तविक बाजार कीमत से अलग हो सकती हैं।',
    agreeText: 'मैं उपरोक्त अस्वीकरण को समझता/समझती हूँ और सहमत हूँ।',
    continueBtn: 'जारी रखें',
  },
  ml: {
    label: 'മലയാളം',
    title: 'നിരാകരണം',
    text: 'MyGold സ്വർണ്ണവും വെള്ളിയും സംബന്ധിച്ച ആസ്തികൾ ട്രാക്ക് ചെയ്യുന്നതിനും ഏകദേശ വില അറിയുന്നതിനുമുള്ള ഒരു ആപ്ലിക്കേഷൻ മാത്രമാണ്. സ്വർണ്ണം, വെള്ളി, പണം അല്ലെങ്കിൽ മറ്റ് സാമ്പത്തിക ആസ്തികൾ വാങ്ങുന്നതിനോ വിൽക്കുന്നതിനോ ഇത് സേവനം നൽകുന്നില്ല. കാണിക്കുന്ന വിലകൾ ഏകദേശ വിലകളാണ്; യഥാർത്ഥ വിപണി വില വ്യത്യാസപ്പെടാം.',
    agreeText: 'മുകളിൽ പറഞ്ഞ നിരാകരണം ഞാൻ മനസ്സിലാക്കുകയും അംഗീകരിക്കുകയും ചെയ്യുന്നു.',
    continueBtn: 'തുടരുക',
  },
  te: {
    label: 'తెలుగు',
    title: 'నిరాకరణ',
    text: 'MyGold బంగారం మరియు వెండి ఆస్తులను ట్రాక్ చేయడానికి మరియు సుమారు ధరను తెలుసుకోవడానికి మాత్రమే ఉపయోగించబడుతుంది. బంగారం, వెండి, డబ్బు లేదా ఇతర ఆర్థిక ఆస్తులను కొనుగోలు చేయడానికి లేదా విక్రయించడానికి ఇది ఎటువంటి సేవను అందించదు. చూపించే ధరలు సుమారు ధరలు మాత్రమే; వాస్తవ మార్కెట్ ధర మారవచ్చు.',
    agreeText: 'పైన పేర్కొన్న నిరాకరణను నేను అర్థం చేసుకున్నాను మరియు అంగీకరిస్తున్నాను.',
    continueBtn: 'కొనసాగించండి',
  },
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'te', name: 'తెలుగు' },
];

export const DisclaimerModal = () => {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language || 'en');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (language && DISCLAIMER_DATA[language]) {
      setSelectedLang(language);
    }
  }, [language]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const userKey = `mygold_disclaimer_ack_${user.id || user.username || 'user'}`;
      const hasAcknowledged = localStorage.getItem(userKey);
      if (!hasAcknowledged) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [isAuthenticated, user]);

  const handleContinue = () => {
    if (!agreed || !user) return;
    const userKey = `mygold_disclaimer_ack_${user.id || user.username || 'user'}`;
    localStorage.setItem(userKey, 'true');
    setIsOpen(false);
    navigate('/');
  };

  if (!isOpen) return null;

  const currentContent = DISCLAIMER_DATA[selectedLang] || DISCLAIMER_DATA.en;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[var(--bg-card)] dark:bg-[#0E1526] border border-[var(--border-color)] dark:border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(245,158,11,0.2)] p-6 sm:p-7 text-[var(--text-primary)] dark:text-white overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Icon & Title */}
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 dark:from-amber-500 dark:to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
            <FiShield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xl font-black font-heading tracking-tight text-[var(--text-primary)] dark:text-white">
              {currentContent.title}
            </h3>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400">
              Important Notice • MyGold
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="mb-4 relative z-10">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] dark:text-slate-400 mb-1.5 ml-0.5">
            Select Language
          </label>
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

        {/* Disclaimer Text Body */}
        <div className="my-4 p-4 rounded-2xl bg-[var(--bg-subtle)] dark:bg-slate-900/70 border border-[var(--border-color)] dark:border-slate-800/80 relative z-10">
          <p className="text-xs sm:text-sm text-[var(--text-primary)] dark:text-slate-200 leading-relaxed font-medium">
            {currentContent.text}
          </p>
        </div>

        {/* Acknowledgement Checkbox */}
        <div className="my-4 relative z-10">
          <label className="flex items-start gap-3 p-2 rounded-xl cursor-pointer select-none hover:bg-[var(--bg-subtle)] dark:hover:bg-slate-900/40 transition-colors">
            <div className="relative flex items-center mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                  agreed
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                    : 'border-slate-400 dark:border-slate-600 bg-transparent'
                }`}
              >
                {agreed && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-slate-300 leading-snug">
              {currentContent.agreeText}
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="relative z-10 pt-1">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!agreed}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm font-heading transition-all flex items-center justify-center gap-2 ${
              agreed
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 active:scale-[0.98] cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            {currentContent.continueBtn}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DisclaimerModal;
