"""RSS feed sources for गाजियाबाद टाइम्स. All use free public Google News RSS
(no API keys required). Each entry maps to a public-site category + region label."""

from urllib.parse import quote

HL = "hl=hi-IN&gl=IN&ceid=IN:hi"


def _search(q):
    return f"https://news.google.com/rss/search?q={quote(q)}&{HL}"


def _topic(t):
    return f"https://news.google.com/rss/headlines/section/topic/{t}?{HL}"


# category, category_hi, region, url
FEEDS = [
    # National / breaking
    ("rashtriya", "राष्ट्रीय", "भारत", _topic("NATION")),
    ("rashtriya", "राष्ट्रीय", "भारत", _search("भारत ताज़ा समाचार")),
    # Ghaziabad hyperlocal
    ("ghaziabad", "गाजियाबाद", "गाजियाबाद", _search("गाजियाबाद समाचार")),
    ("ghaziabad", "गाजियाबाद", "गाजियाबाद", _search("Ghaziabad news")),
    # Noida / Greater Noida
    ("noida", "नोएडा", "नोएडा", _search("नोएडा ग्रेटर नोएडा समाचार")),
    ("noida", "नोएडा", "गौतमबुद्ध नगर", _search("Noida Greater Noida news")),
    # West UP - Meerut, Hapur, Bulandshahr, Baghpat
    ("paschim-up", "पश्चिमी यूपी", "मेरठ", _search("मेरठ समाचार")),
    ("paschim-up", "पश्चिमी यूपी", "हापुड़", _search("हापुड़ समाचार")),
    ("paschim-up", "पश्चिमी यूपी", "बुलंदशहर", _search("बुलंदशहर समाचार")),
    ("paschim-up", "पश्चिमी यूपी", "बागपत", _search("बागपत समाचार")),
    # UP Government / bureaucracy / police transfers / govt orders
    ("up-sarkar", "यूपी सरकार", "उत्तर प्रदेश", _search("उत्तर प्रदेश सरकार तबादला IAS IPS")),
    ("up-sarkar", "यूपी सरकार", "उत्तर प्रदेश", _search("यूपी पुलिस तबादला")),
    ("up-sarkar", "यूपी सरकार", "उत्तर प्रदेश", _search("उत्तर प्रदेश सरकारी आदेश घोषणा")),
    # Delhi
    ("delhi", "दिल्ली", "दिल्ली", _search("दिल्ली समाचार")),
    # Sports
    ("khel", "खेल", "खेल", _topic("SPORTS")),
    # Cinema / TV serials
    ("cinema", "सिनेमा", "मनोरंजन", _topic("ENTERTAINMENT")),
    ("cinema", "सिनेमा", "टीवी", _search("हिंदी टीवी सीरियल समाचार")),
    # Education
    ("shiksha", "शिक्षा", "उत्तर प्रदेश", _search("शिक्षा विभाग उत्तर प्रदेश समाचार")),
    # Health / medical
    ("swasthya", "स्वास्थ्य", "उत्तर प्रदेश", _search("स्वास्थ्य विभाग उत्तर प्रदेश चिकित्सा समाचार")),
    # Employment / govt jobs
    ("rozgar", "रोज़गार", "उत्तर प्रदेश", _search("सरकारी नौकरी भर्ती उत्तर प्रदेश")),
    # Business / finance
    ("vyapar", "व्यापार", "व्यापार", _topic("BUSINESS")),
]

# Public-site category order + labels
CATEGORIES = [
    {"key": "rashtriya", "hi": "राष्ट्रीय", "en": "National"},
    {"key": "ghaziabad", "hi": "गाजियाबाद", "en": "Ghaziabad"},
    {"key": "noida", "hi": "नोएडा", "en": "Noida"},
    {"key": "paschim-up", "hi": "पश्चिमी यूपी", "en": "West UP"},
    {"key": "up-sarkar", "hi": "यूपी सरकार", "en": "UP Govt"},
    {"key": "delhi", "hi": "दिल्ली", "en": "Delhi"},
    {"key": "khel", "hi": "खेल", "en": "Sports"},
    {"key": "cinema", "hi": "सिनेमा", "en": "Cinema"},
    {"key": "shiksha", "hi": "शिक्षा", "en": "Education"},
    {"key": "swasthya", "hi": "स्वास्थ्य", "en": "Health"},
    {"key": "rozgar", "hi": "रोज़गार", "en": "Jobs"},
    {"key": "vyapar", "hi": "व्यापार", "en": "Business"},
]

CATEGORY_LABELS = {c["key"]: c for c in CATEGORIES}
