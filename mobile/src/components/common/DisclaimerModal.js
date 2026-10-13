import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { darkTheme } from '../../constants/theme';
import { gradientPresets } from '../../constants/colors';

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

export default function DisclaimerModal() {
  const { user, isAuthenticated } = useAuth();
  const { language } = typeof useLanguage === 'function' ? useLanguage() : { language: 'en' };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [agreed, setAgreed] = useState(false);

  // Sync initial language with app language if available
  useEffect(() => {
    if (language && DISCLAIMER_DATA[language]) {
      setSelectedLang(language);
    }
  }, [language]);

  // Check if current user has already acknowledged the disclaimer
  const checkAcknowledgement = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsOpen(false);
      return;
    }

    const userId = user.id || user.username;
    if (!userId) {
      setIsOpen(false);
      return;
    }

    try {
      const storageKey = `mygold_disclaimer_ack_${userId}`;
      const ack = await AsyncStorage.getItem(storageKey);
      if (ack === 'true') {
        setIsOpen(false);
      } else {
        setAgreed(false);
        setIsOpen(true);
      }
    } catch {
      // Fallback: default to false if storage read fails
      setIsOpen(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    checkAcknowledgement();
  }, [checkAcknowledgement]);

  // Handle user acknowledgement
  const handleAcknowledge = async () => {
    if (!agreed || !user) return;

    const userId = user.id || user.username;
    if (!userId) return;

    try {
      const storageKey = `mygold_disclaimer_ack_${userId}`;
      await AsyncStorage.setItem(storageKey, 'true');
      setIsOpen(false);
    } catch {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  const currentContent = DISCLAIMER_DATA[selectedLang] || DISCLAIMER_DATA.en;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Prevent accidental hardware back dismissal before explicit acknowledgement
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <LinearGradient
              colors={gradientPresets.goldMetallic}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Feather name="shield" size={22} color="#080B12" />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{currentContent.title}</Text>
              <Text style={styles.subtitle}>Important Notice • MyGold</Text>
            </View>
          </View>

          {/* Language Selector */}
          <View style={styles.languageSection}>
            <Text style={styles.languageSectionLabel}>Select Language</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.languagePillsRow}
            >
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setSelectedLang(lang.code)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${lang.name}`}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={gradientPresets.goldMetallic}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.languagePillSelectedGrad}
                      >
                        <Text style={styles.languagePillTextSelected}>{lang.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.languagePill}>
                        <Text style={styles.languagePillText}>{lang.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Scrollable Disclaimer Text */}
          <View style={styles.disclaimerTextBox}>
            <ScrollView
              style={styles.textScrollView}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <Text style={styles.disclaimerBody}>{currentContent.text}</Text>
            </ScrollView>
          </View>

          {/* Checkbox Acknowledge Row */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Feather name="check" size={14} color="#080B12" />}
            </View>
            <Text style={styles.agreeLabel}>{currentContent.agreeText}</Text>
          </TouchableOpacity>

          {/* Primary Action Button */}
          {agreed ? (
            <TouchableOpacity
              style={styles.continueButtonWrapper}
              onPress={handleAcknowledge}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={currentContent.continueBtn}
            >
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>{currentContent.continueBtn}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View
              style={styles.continueButtonDisabled}
              accessibilityRole="button"
              accessibilityLabel={currentContent.continueBtn}
            >
              <Text style={styles.continueButtonTextDisabled}>{currentContent.continueBtn}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 179, 49, 0.35)',
    padding: 20,
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: darkTheme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  languageSection: {
    marginBottom: 14,
  },
  languageSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: darkTheme.colors.textMuted,
    marginBottom: 6,
    marginLeft: 2,
  },
  languagePillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  languagePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languagePillSelectedGrad: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textMuted,
  },
  languagePillTextSelected: {
    color: '#080B12',
    fontWeight: '800',
  },
  disclaimerTextBox: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    padding: 14,
    maxHeight: 160,
    marginBottom: 14,
  },
  textScrollView: {
    flexGrow: 0,
  },
  disclaimerBody: {
    fontSize: 13,
    lineHeight: 20,
    color: darkTheme.colors.textSecondary,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: darkTheme.colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: darkTheme.colors.gold,
    borderColor: darkTheme.colors.gold,
  },
  agreeLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    lineHeight: 17,
  },
  continueButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: darkTheme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  continueButtonGradient: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  continueButtonDisabled: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  continueButtonText: {
    color: '#080B12',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  continueButtonTextDisabled: {
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
