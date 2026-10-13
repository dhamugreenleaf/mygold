import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientPresets } from '../../constants/colors';
import { darkTheme } from '../../constants/theme';

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

export default function TermsModal({ isOpen, onClose }) {
  const [selectedLang, setSelectedLang] = useState('en');

  if (!isOpen) return null;

  const currentContent = TERMS_DATA[selectedLang] || TERMS_DATA.en;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Feather name="file-text" size={20} color={darkTheme.colors.gold} />
              </View>
              <View>
                <Text style={styles.title}>Terms & Conditions</Text>
                <Text style={styles.subtitle}>MyGold • Legal & Disclaimer Notice</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close terms modal"
            >
              <Feather name="x" size={20} color={darkTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Language selector chips */}
          <View style={styles.langSelector}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.langScrollContent}
            >
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setSelectedLang(lang.code)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${lang.name}`}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={gradientPresets.goldMetallic}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.langChipActiveGrad}
                      >
                        <Text style={styles.langChipTextActive}>{lang.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.langChip}>
                        <Text style={styles.langChipText}>{lang.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Scrollable Legal Content */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.disclaimerBox}>
              <Text style={styles.sectionTitle}>{currentContent.sectionTitle}</Text>

              {currentContent.paragraphs.map((p, idx) => (
                <Text key={`terms-p-${idx}`} style={styles.paragraph}>
                  {p}
                </Text>
              ))}

              <View style={styles.highlightCard}>
                <Text style={styles.highlightText}>{currentContent.highlight}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Notice & Close Button */}
          <View style={styles.footer}>
            <View style={styles.infoRow}>
              <Feather name="info" size={14} color={darkTheme.colors.gold} />
              <Text style={styles.footerNotice}>{currentContent.footerNotice}</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={currentContent.closeBtn}
            >
              <LinearGradient
                colors={gradientPresets.goldMetallic}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>{currentContent.closeBtn}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '86%',
    backgroundColor: darkTheme.colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    overflow: 'hidden',
    ...darkTheme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 179, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: darkTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langSelector: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.borderSubtle,
  },
  langScrollContent: {
    gap: 8,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
  },
  langChipActiveGrad: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.textSecondary,
  },
  langChipTextActive: {
    color: '#080B12',
    fontWeight: '900',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  disclaimerBox: {
    backgroundColor: darkTheme.colors.backgroundSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: darkTheme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: darkTheme.colors.textSecondary,
    fontWeight: '500',
  },
  highlightCard: {
    backgroundColor: 'rgba(232, 179, 49, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 49, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.colors.gold,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.borderSubtle,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerNotice: {
    fontSize: 11,
    color: darkTheme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  actionButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.button,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080B12',
  },
});
