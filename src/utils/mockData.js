// Mock Data for VouchRank & AIO Hub

export const MOCK_COMPANIES = [
  {
    id: "austin-dental",
    name: "Austin Dental Care",
    category: "Healthcare / Local Business",
    domain: "austindentalcare.com",
    logoText: "AD",
    colors: {
      primary: "#06b6d4", // Cyan
      secondary: "#0284c7" // Blue
    },
    googleRating: 4.7,
    googleCount: 142,
    videoCount: 18,
    aioVisibility: 72
  },
  {
    id: "apex-tech",
    name: "Apex Software Solutions",
    category: "B2B SaaS / IT Services",
    domain: "apexsoftware.io",
    logoText: "AS",
    colors: {
      primary: "#8b5cf6", // Violet
      secondary: "#ec4899" // Pink
    },
    googleRating: 4.9,
    googleCount: 68,
    videoCount: 24,
    aioVisibility: 88
  },
  {
    id: "green-garden",
    name: "Green Garden Landscaping",
    category: "Home Services / Contractor",
    domain: "greengardenlandscaping.com",
    logoText: "GG",
    colors: {
      primary: "#10b981", // Emerald
      secondary: "#059669" // Green
    },
    googleRating: 4.3,
    googleCount: 52,
    videoCount: 4,
    aioVisibility: 45
  }
];

export const MOCK_REVIEWS = [
  // Austin Dental Reviews
  {
    id: "r1",
    status: "approved",
    companyId: "austin-dental",
    author: "Sarah Jenkins",
    avatar: "SJ",
    rating: 5,
    source: "Google",
    text: "I had an emergency wisdom tooth extraction here, and the experience was amazing. The staff was incredibly friendly and the clinic is clean and modern. They got me in on the same day!",
    keywords: ["emergency", "clean clinic", "friendly staff"],
    sentiment: "positive",
    date: "2 days ago",
    aiReply: "Hi Sarah, thank you for the wonderful feedback! We are so glad our team could accommodate your emergency extraction quickly and comfortably. Take care!"
  },
  {
    id: "r2",
    status: "pending",
    companyId: "austin-dental",
    author: "Marcus Vance",
    avatar: "MV",
    rating: 5,
    source: "Video",
    text: "Absolutely the best dental care in Austin. I used to be terrified of dentists, but Austin Dental Care completely changed my mindset. The staff makes you feel right at home.",
    videoUrl: "simulated-video-1.mp4",
    keywords: ["best dental care", "terrified of dentists", "relaxing environment"],
    sentiment: "positive",
    date: "1 week ago",
    aiReply: null
  },
  {
    id: "r3",
    status: "approved",
    companyId: "austin-dental",
    author: "Elena Rostova",
    avatar: "ER",
    rating: 3,
    source: "Manual",
    text: "The dental work was fine, but the wait time was close to 45 minutes even with an appointment. I hope they improve their scheduling efficiency.",
    keywords: ["wait time", "scheduling"],
    sentiment: "neutral",
    date: "2 weeks ago",
    aiReply: "Hello Elena, we sincerely apologize for the wait time you experienced. We are actively refining our appointment slots to improve our scheduling."
  },
  {
    id: "r4",
    status: "rejected",
    rejectReason: "fake",
    rejectNote: "Reviewer could not be matched to an appointment record.",
    companyId: "austin-dental",
    author: "Danielle K.",
    avatar: "DK",
    rating: 5,
    source: "Video",
    text: "The pediatric dentists here were fantastic with my 6-year-old. No tears, very gentle, and he actually enjoyed the prize box! Highly recommend for families.",
    videoUrl: "simulated-video-2.mp4",
    keywords: ["pediatric dentists", "gentle", "families"],
    sentiment: "positive",
    date: "3 weeks ago",
    aiReply: null
  },

  // Apex Software Reviews
  {
    id: "r5",
    status: "approved",
    companyId: "apex-tech",
    author: "Johnathan Miller",
    avatar: "JM",
    rating: 5,
    source: "Google",
    text: "Apex helped us migrate our legacy infrastructure to AWS. Their Cloud Architecture team was incredibly knowledgeable and saved us 30% in monthly hosting costs.",
    keywords: ["AWS migration", "Cloud Architecture", "hosting cost reduction"],
    sentiment: "positive",
    date: "Yesterday",
    aiReply: "Hi Johnathan! We are thrilled to hear the AWS migration went smoothly and yielded significant hosting savings. It was a pleasure working with your team."
  },
  {
    id: "r6",
    status: "pending",
    companyId: "apex-tech",
    author: "Samantha Cole",
    avatar: "SC",
    rating: 5,
    source: "Video",
    text: "We hired Apex for custom app development. Their communication was flawless throughout the project lifecycle. They delivered the MVP ahead of schedule and under budget.",
    videoUrl: "simulated-video-3.mp4",
    keywords: ["custom app development", "communication", "MVP ahead of schedule"],
    sentiment: "positive",
    date: "4 days ago",
    aiReply: null
  },
  {
    id: "r7",
    status: "approved",
    companyId: "apex-tech",
    author: "Brian O'Connor",
    avatar: "BO",
    rating: 2,
    source: "Google",
    text: "The developers are very skilled, but they took a week to respond to critical bugs in our staging environment. Communication lines need to be clearer.",
    keywords: ["dev skills", "bug response time", "communication gap"],
    sentiment: "negative",
    date: "1 month ago",
    aiReply: null
  },

  // Green Garden Reviews
  {
    id: "r8",
    status: "approved",
    companyId: "green-garden",
    author: "Alice Cooper",
    avatar: "AC",
    rating: 4,
    source: "Google",
    text: "Did a great job redesigning our backyard patio and putting in the new sod lawn. A bit expensive, but the execution was top tier.",
    keywords: ["backyard patio", "sod lawn", "patio landscaping"],
    sentiment: "positive",
    date: "1 week ago",
    aiReply: "Thanks Alice! We are glad you love the patio and lawn design. Quality work is our priority!"
  },
  {
    id: "r9",
    status: "approved",
    companyId: "green-garden",
    author: "Gary Peterson",
    avatar: "GP",
    rating: 5,
    source: "Video",
    text: "Green Garden cleans up perfectly after every visit. Our hedges are beautifully trimmed and they never leave debris in the driveway. Very professional landscaping team.",
    videoUrl: "simulated-video-4.mp4",
    keywords: ["professional landscaping", "hedges", "perfect cleanup"],
    sentiment: "positive",
    date: "2 weeks ago",
    aiReply: null
  }
];

export const MOCK_AIO_AUDITS = {
  "austin-dental": {
    rating: 72,
    queries: [
      {
        id: "q1",
        query: "Who is the best emergency dentist in Austin?",
        sources: "Gemini, ChatGPT",
        recommended: true,
        rank: 2,
        competitors: ["North Austin Dental", "Westlake Smiles"]
      },
      {
        id: "q2",
        query: "Recommended pediatric dentist in Austin with short wait times",
        sources: "Perplexity, Gemini",
        recommended: false,
        rank: null,
        competitors: ["Little Smiles Austin", "Happy Teeth Pediatric"]
      },
      {
        id: "q3",
        query: "Clean and friendly dental clinics in Austin area",
        sources: "ChatGPT, Gemini, Perplexity",
        recommended: true,
        rank: 1,
        competitors: ["North Austin Dental"]
      }
    ],
    checklist: [
      {
        id: "c1",
        badge: "Keyword GAP",
        title: "Acquire reviews mentioning 'pediatric' and 'gentle'",
        description: "AI search engines are currently recommending 'Little Smiles Austin' because their reviews contain 24 mentions of 'pediatric dentist'. You only have 3.",
        checked: false
      },
      {
        id: "c2",
        badge: "Sentiment GAP",
        title: "Address public reviews mentioning 'wait times'",
        description: "Perplexity flags 'Austin Dental Care' with warning tags on scheduling because of 4 public reviews complaining about 40+ minute wait times.",
        checked: false
      },
      {
        id: "c3",
        badge: "Integration",
        title: "Sync verified schema reviews to company homepage",
        description: "Optimize HTML metadata on your site to let Google & Bing crawlers index your video reviews as rich snippet structured schema.",
        checked: true
      }
    ]
  },
  "apex-tech": {
    rating: 88,
    queries: [
      {
        id: "q4",
        query: "Who can help me migrate to AWS in Austin?",
        sources: "Gemini, Perplexity",
        recommended: true,
        rank: 1,
        competitors: ["ScaleUp Solutions", "DevOps Specialists"]
      },
      {
        id: "q5",
        query: "Reliable custom app developers in Austin under budget",
        sources: "ChatGPT, Perplexity",
        recommended: true,
        rank: 2,
        competitors: ["ByteSize Code", "Capital Web Builders"]
      },
      {
        id: "q6",
        query: "IT consultants in Austin with fast response times",
        sources: "Gemini, ChatGPT",
        recommended: false,
        rank: null,
        competitors: ["Rapid Support Group", "ScaleUp Solutions"]
      }
    ],
    checklist: [
      {
        id: "c4",
        badge: "Keyword GAP",
        title: "Harvest reviews containing 'fast response' or 'reliable debugging'",
        description: "AI models query support responsiveness when recommending IT consultancies. Collect 3 new reviews focusing on your dev response times.",
        checked: false
      },
      {
        id: "c5",
        badge: "AIO Signal",
        title: "Publish 2 case studies on AWS hosting savings",
        description: "Provide crawlable backlinks matching review statements so LLM search models can double-verify your 30% cost savings claim.",
        checked: true
      }
    ]
  },
  "green-garden": {
    rating: 45,
    queries: [
      {
        id: "q7",
        query: "Affordable backyard patio contractors in Austin",
        sources: "ChatGPT",
        recommended: false,
        rank: null,
        competitors: ["Austin Stone & Deck", "Sod Specialists"]
      },
      {
        id: "q8",
        query: "Professional hedges trimming services in Austin area",
        sources: "Gemini, Perplexity",
        recommended: true,
        rank: 3,
        competitors: ["Tree & Hedge Masters", "Austin Greenery"]
      }
    ],
    checklist: [
      {
        id: "c6",
        badge: "Review Volume",
        title: "Collect more visual/video review proofs",
        description: "Your competitors have over 50 Google reviews and video testimonials. You only have 9, which limits AI search index confidence.",
        checked: false
      },
      {
        id: "c7",
        badge: "Keyword GAP",
        title: "Request reviews highlighting 'patio installation'",
        description: "Your reviews focus heavily on general lawn care. Gather 4 reviews targeting patio design/patio installations specifically.",
        checked: false
      }
    ]
  }
};

export const MOCK_COMPETITORS = {
  "austin-dental": [
    { name: "North Austin Dental", rating: 4.8, reviewCount: 198, videoCount: 12, aioScore: 85, replyRate: 92, history: [140, 150, 165, 180, 198] },
    { name: "Westlake Smiles", rating: 4.6, reviewCount: 164, videoCount: 15, aioScore: 78, replyRate: 45, history: [120, 132, 144, 155, 164] },
    { name: "Happy Teeth Pediatric", rating: 4.9, reviewCount: 88, videoCount: 22, aioScore: 65, replyRate: 100, history: [60, 68, 74, 80, 88] }
  ],
  "apex-tech": [
    { name: "ScaleUp Solutions", rating: 4.7, reviewCount: 92, videoCount: 8, aioScore: 82, replyRate: 78, history: [70, 75, 80, 86, 92] },
    { name: "DevOps Specialists", rating: 4.5, reviewCount: 54, videoCount: 3, aioScore: 60, replyRate: 33, history: [40, 44, 48, 50, 54] },
    { name: "ByteSize Code", rating: 4.8, reviewCount: 41, videoCount: 10, aioScore: 74, replyRate: 90, history: [25, 30, 34, 38, 41] }
  ],
  "green-garden": [
    { name: "Tree & Hedge Masters", rating: 4.7, reviewCount: 112, videoCount: 14, aioScore: 70, replyRate: 85, history: [90, 96, 102, 107, 112] },
    { name: "Austin Stone & Deck", rating: 4.4, reviewCount: 84, videoCount: 2, aioScore: 52, replyRate: 20, history: [70, 74, 78, 81, 84] },
    { name: "Sod Specialists", rating: 4.8, reviewCount: 65, videoCount: 8, aioScore: 62, replyRate: 95, history: [45, 50, 56, 60, 65] }
  ]
};

export const MOCK_CAMPAIGNS = {
  "austin-dental": {
    sms: "Hi [First Name]! Thanks for choosing Austin Dental Care. How was your visit? Rate us here: https://vouchrank.com/rate/austin-dental",
    email: "Subject: How did we do? | Austin Dental Care\n\nDear [First Name],\nThank you for choosing us for your dental care. We strive to provide the best service. Please take 30 seconds to rate us and record a brief video review: https://vouchrank.com/rate/austin-dental",
    history: [
      { id: "c1", type: "SMS", recipient: "David S.", status: "Delivered", clicked: true, date: "10 mins ago" },
      { id: "c2", type: "Email", recipient: "Rachel G.", status: "Delivered", clicked: false, date: "1 hour ago" },
      { id: "c3", type: "SMS", recipient: "Oliver K.", status: "Delivered", clicked: true, date: "3 hours ago" }
    ]
  },
  "apex-tech": {
    sms: "Hi [First Name], thanks for partnering with Apex. How is your project going? Rate us and leave a video review: https://vouchrank.com/rate/apex-tech",
    email: "Subject: Help us improve Apex Software Solutions\n\nHi [First Name],\nWe appreciate your partnership. We are conducting our quarterly feedback review. Please share your thoughts with us: https://vouchrank.com/rate/apex-tech",
    history: [
      { id: "c4", type: "Email", recipient: "Tech Solutions CEO", status: "Delivered", clicked: true, date: "Yesterday" },
      { id: "c5", type: "SMS", recipient: "Stripe Team Lead", status: "Delivered", clicked: true, date: "2 days ago" }
    ]
  },
  "green-garden": {
    sms: "Hi [First Name]! Green Garden appreciates your business. Please rate our cleanup and hedges care: https://vouchrank.com/rate/green-garden",
    email: "Subject: Rate your backyard patio redesign | Green Garden\n\nDear [First Name],\nWe hope you love your new patio and lawn! We value your feedback. Let us know how we did: https://vouchrank.com/rate/green-garden",
    history: [
      { id: "c6", type: "SMS", recipient: "Melissa W.", status: "Delivered", clicked: false, date: "3 days ago" },
      { id: "c7", type: "SMS", recipient: "Frank P.", status: "Delivered", clicked: true, date: "5 days ago" }
    ]
  }
};

