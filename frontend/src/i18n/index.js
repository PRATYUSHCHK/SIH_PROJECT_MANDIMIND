export const dictionaries = {
  en: {
    decisionToday: 'What should I do today?',
    estimatedReturn: 'Estimated return',
    likelyPrice: 'Likely price range',
    confidenceEstimate: 'Confidence in this estimate',
    expectedDemandStrong: 'Expected demand is strong',
  },
  hi: {
    decisionToday: 'आज मुझे क्या करना चाहिए?',
    estimatedReturn: 'अनुमानित रिटर्न',
    likelyPrice: 'संभावित मूल्य सीमा',
    confidenceEstimate: 'इस अनुमान में विश्वास',
    expectedDemandStrong: 'मांग मजबूत रहने की उम्मीद',
  },
  te: {
    decisionToday: 'నేడు నేను ఏమి చేయాలి?',
    estimatedReturn: 'అంచనా రాబడి',
    likelyPrice: 'సంభావ్య ధర పరిధి',
    confidenceEstimate: 'ఈ అంచనాపై నమ్మకం',
    expectedDemandStrong: 'డిమాండ్ బలంగా ఉంటుంది',
  },
  ta: {
    decisionToday: 'இன்று நான் என்ன செய்ய வேண்டும்?',
    estimatedReturn: 'மதிப்பிடப்பட்ட வருமானம்',
    likelyPrice: 'சாத்தியமான விலை வரம்பு',
    confidenceEstimate: 'இந்த மதிப்பீட்டில் நம்பிக்கை',
    expectedDemandStrong: 'தேவை வலுவாக இருக்கும்',
  },
};

export function t(lang, key) {
  return dictionaries[lang]?.[key] || dictionaries.en[key] || key;
}
