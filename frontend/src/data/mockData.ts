import { Company, HindsightRecord, MarketEvent, MemoryNode, MemoryEdge, InvestmentMemo } from '../types';

export const initialCompanies: Company[] = [
  {
    id: 'nvda',
    name: 'NVIDIA Corporation',
    ticker: 'NVDA',
    description: 'Global leader in GPU-accelerated computing, AI hardware, and CUDA software infrastructure.',
    sector: 'Semiconductors',
    alignmentScore: 88,
    revenueData: [
      { period: '2023', revenue: 26974, netMargin: 16.2 },
      { period: '2024', revenue: 60922, netMargin: 48.8 },
      { period: '2025', revenue: 96300, netMargin: 53.2 },
      { period: 'Q1 2026', revenue: 26044, netMargin: 57.1 }
    ],
    products: [
      { name: 'H100 GPU (Hopper)', status: 'active', marketAdoption: 98, hindsightDelta: 15 },
      { name: 'Blackwell GPU (B200)', status: 'beta', marketAdoption: 75, hindsightDelta: -10 },
      { name: 'CUDA Platform', status: 'active', marketAdoption: 95, hindsightDelta: 5 },
      { name: 'DGX Cloud', status: 'active', marketAdoption: 45, hindsightDelta: -20 }
    ],
    expectations: [
      { id: 'nvda-exp-1', description: 'Blackwell GPU shipping in high volume by Q4 2024', targetTimeline: 'Q4 2024', metricTarget: 'Gross Margin > 75%' },
      { id: 'nvda-exp-2', description: 'DGX Cloud subscriptions reaching $5B run rate by 2026', targetTimeline: 'Q4 2026', metricTarget: 'Subscription ARR' },
      { id: 'nvda-exp-3', description: 'CoWoS supply constraints fully resolved by mid-2025', targetTimeline: 'Q2 2025', metricTarget: 'Supply Volume' }
    ]
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    description: 'Premium consumer electronics giant expanding into spatial computing, services, and local on-device AI.',
    sector: 'Consumer Tech',
    alignmentScore: 62,
    revenueData: [
      { period: '2023', revenue: 383285, netMargin: 25.3 },
      { period: '2024', revenue: 391035, netMargin: 25.8 },
      { period: '2025', revenue: 412500, netMargin: 26.5 },
      { period: 'Q1 2026', revenue: 119575, netMargin: 28.2 }
    ],
    products: [
      { name: 'iPhone Series', status: 'active', marketAdoption: 92, hindsightDelta: 2 },
      { name: 'Apple Vision Pro', status: 'active', marketAdoption: 25, hindsightDelta: -65 },
      { name: 'Apple Intelligence', status: 'beta', marketAdoption: 58, hindsightDelta: -15 },
      { name: 'Apple Services (Music, iCloud, Pay)', status: 'active', marketAdoption: 85, hindsightDelta: 12 }
    ],
    expectations: [
      { id: 'aapl-exp-1', description: 'Apple Vision Pro selling 1,000,000 units in year one', targetTimeline: 'Q1 2025', metricTarget: 'Unit Sales' },
      { id: 'aapl-exp-2', description: 'Apple Intelligence driving 20% handset upgrade supercycle', targetTimeline: 'Q4 2025', metricTarget: 'iPhone Unit Growth' },
      { id: 'aapl-exp-3', description: 'Services margin expanding to 75% under recurring premium plans', targetTimeline: 'Q2 2026', metricTarget: 'Gross Margin' }
    ]
  },
  {
    id: 'tsla',
    name: 'Tesla, Inc.',
    ticker: 'TSLA',
    description: 'Electric vehicle manufacturer transitioning into an autonomous driving, robotics, and energy platform.',
    sector: 'Automotive & Robotics',
    alignmentScore: 54,
    revenueData: [
      { period: '2023', revenue: 96773, netMargin: 15.5 },
      { period: '2024', revenue: 98450, netMargin: 11.2 },
      { period: '2025', revenue: 112000, netMargin: 12.8 },
      { period: 'Q1 2026', revenue: 28500, netMargin: 13.5 }
    ],
    products: [
      { name: 'Model 3/Y Vehicles', status: 'active', marketAdoption: 88, hindsightDelta: -5 },
      { name: 'Cybertruck', status: 'active', marketAdoption: 40, hindsightDelta: -45 },
      { name: 'FSD (Full Self-Driving)', status: 'active', marketAdoption: 30, hindsightDelta: -60 },
      { name: 'Megapack Energy Storage', status: 'active', marketAdoption: 70, hindsightDelta: 35 }
    ],
    expectations: [
      { id: 'tsla-exp-1', description: 'Autonomous Robotaxi network launch in major US cities', targetTimeline: 'Q3 2025', metricTarget: 'Active Fleet Count' },
      { id: 'tsla-exp-2', description: 'Cybertruck achieving 250,000 annual production run-rate', targetTimeline: 'Q4 2024', metricTarget: 'Weekly Output' },
      { id: 'tsla-exp-3', description: 'Optimus Humanoid Robot working in factories by 2026', targetTimeline: 'Q4 2026', metricTarget: 'Deployed Units' }
    ]
  },
  {
    id: 'msft',
    name: 'Microsoft Corporation',
    ticker: 'MSFT',
    description: 'Enterprise software titan, cloud pioneer, and primary backer/infrastructure provider for OpenAI.',
    sector: 'Software & Cloud',
    alignmentScore: 92,
    revenueData: [
      { period: '2023', revenue: 211915, netMargin: 34.1 },
      { period: '2024', revenue: 245120, netMargin: 36.0 },
      { period: '2025', revenue: 282400, netMargin: 37.5 },
      { period: 'Q1 2026', revenue: 74200, netMargin: 39.1 }
    ],
    products: [
      { name: 'Azure Cloud Platform', status: 'active', marketAdoption: 94, hindsightDelta: 10 },
      { name: 'Copilot (M365)', status: 'active', marketAdoption: 65, hindsightDelta: -8 },
      { name: 'GitHub Copilot', status: 'active', marketAdoption: 88, hindsightDelta: 25 },
      { name: 'Windows AI PCs', status: 'active', marketAdoption: 35, hindsightDelta: -15 }
    ],
    expectations: [
      { id: 'msft-exp-1', description: 'Azure AI services contributing >15% of total Azure growth', targetTimeline: 'Q4 2025', metricTarget: 'Azure Growth Contribution' },
      { id: 'msft-exp-2', description: 'Copilot pricing ($30/user/mo) achieving 40% enterprise penetration', targetTimeline: 'Q2 2026', metricTarget: 'Seats Subscribed' }
    ]
  },
  {
    id: 'googl',
    name: 'Alphabet Inc.',
    ticker: 'GOOGL',
    description: 'Search and advertising giant pioneering general-purpose AI via Gemini and scaling Google Cloud platform.',
    sector: 'Software & Cloud',
    alignmentScore: 85,
    revenueData: [
      { period: '2023', revenue: 307394, netMargin: 24.0 },
      { period: '2024', revenue: 328280, netMargin: 27.2 },
      { period: '2025', revenue: 356400, netMargin: 28.5 },
      { period: 'Q1 2026', revenue: 91200, netMargin: 29.8 }
    ],
    products: [
      { name: 'Google Search & Ads', status: 'active', marketAdoption: 95, hindsightDelta: 1 },
      { name: 'Google Cloud Platform (GCP)', status: 'active', marketAdoption: 82, hindsightDelta: 12 },
      { name: 'Gemini Models (API & Pro)', status: 'active', marketAdoption: 70, hindsightDelta: 8 },
      { name: 'Waymo Autonomous Driving', status: 'active', marketAdoption: 40, hindsightDelta: -15 }
    ],
    expectations: [
      { id: 'googl-exp-1', description: 'Gemini integration driving 35% growth in Google Cloud', targetTimeline: 'Q4 2025', metricTarget: 'GCP Growth' },
      { id: 'googl-exp-2', description: 'Waymo driverless rides scaling to 100,000 weekly paid trips', targetTimeline: 'Q2 2025', metricTarget: 'Weekly Rides' },
      { id: 'googl-exp-3', description: 'Search Generative Experience (SGE) retaining 98% user base', targetTimeline: 'Q3 2025', metricTarget: 'Search Query Retention' }
    ]
  },
  {
    id: 'amzn',
    name: 'Amazon.com, Inc.',
    ticker: 'AMZN',
    description: 'E-commerce titan and cloud computing pioneer integrating AI agents into retail, logistics, and AWS.',
    sector: 'Consumer Tech',
    alignmentScore: 78,
    revenueData: [
      { period: '2023', revenue: 574785, netMargin: 5.3 },
      { period: '2024', revenue: 602500, netMargin: 7.2 },
      { period: '2025', revenue: 635000, netMargin: 8.5 },
      { period: 'Q1 2026', revenue: 158400, netMargin: 9.1 }
    ],
    products: [
      { name: 'Amazon E-Commerce Store', status: 'active', marketAdoption: 97, hindsightDelta: 2 },
      { name: 'Amazon Web Services (AWS)', status: 'active', marketAdoption: 93, hindsightDelta: 5 },
      { name: 'Rufus AI Shopping Assistant', status: 'active', marketAdoption: 60, hindsightDelta: 15 },
      { name: 'Kodiak Autonomous Trucking', status: 'beta', marketAdoption: 20, hindsightDelta: -40 }
    ],
    expectations: [
      { id: 'amzn-exp-1', description: 'AWS Bedrock custom agent deployments growing 50% YoY', targetTimeline: 'Q4 2025', metricTarget: 'AWS Bedrock ARR' },
      { id: 'amzn-exp-2', description: 'Rufus AI agent reducing shopping abandonment rate by 15%', targetTimeline: 'Q3 2025', metricTarget: 'Cart Conversion Rate' }
    ]
  }
];

export const initialHindsightLedger: HindsightRecord[] = [
  {
    id: 'h-1',
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    expectationDescription: 'Launch autonomous electric vehicle (Project Titan) by 2025 at 15-20% gross margins.',
    expectedTimeline: '2025',
    actualEventId: 'e-101',
    actualOutcomeDescription: 'Apple officially cancelled Project Titan in Feb 2024, shifting all engineers to Generative AI teams after spending $10B.',
    deviationMetric: 'execution',
    deviationValue: 'cancelled',
    hindsightLesson: 'High capital requirements and low operating margins of automotive supply chains contradict Apple\'s asset-light, premium-software model. Autonomous robotics core competencies are better applied to software agent architectures.',
    severity: 'critical',
    timestamp: '2024-02-27T12:00:00Z'
  },
  {
    id: 'h-2',
    companyId: 'nvda',
    companyName: 'NVIDIA Corporation',
    expectationDescription: 'Blackwell GPU volume shipments starting early Q3 2024 without design complications.',
    expectedTimeline: 'Q3 2024',
    actualEventId: 'e-102',
    actualOutcomeDescription: 'NVIDIA detected a design flaw in Blackwell packaging (TSMC CoWoS-L bridge structure) causing low yields, triggering a 3-month redesign cycle.',
    deviationMetric: 'timeline',
    deviationValue: 'lagging',
    hindsightLesson: 'Advanced multi-die packaging technology (like CoWoS) introduces single-point fabrication risks. Always incorporate a 90-120 day packaging yield buffer for first-generation node transitions.',
    severity: 'moderate',
    timestamp: '2024-08-28T14:30:00Z'
  },
  {
    id: 'h-3',
    companyId: 'tsla',
    companyName: 'Tesla, Inc.',
    expectationDescription: 'Scale Cybertruck output rapidly to 250,000 units by the end of 2024.',
    expectedTimeline: 'Q4 2024',
    actualEventId: 'e-103',
    actualOutcomeDescription: 'Production constraints on the 4680 structural battery cells and difficulties bending 30X cold-rolled stainless steel limited unit output to ~25,000.',
    deviationMetric: 'timeline',
    deviationValue: 'lagging',
    hindsightLesson: 'Aesthetic-driven novel structural materials (unpainted stainless steel) create compounding assembly difficulties. Standardize structural designs unless battery cost gains justify manufacturing risk.',
    severity: 'moderate',
    timestamp: '2024-12-15T09:00:00Z'
  },
  {
    id: 'h-4',
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    expectationDescription: 'Sell 1,000,000 Apple Vision Pro spatial computer units in Year 1.',
    expectedTimeline: 'Q1 2025',
    actualEventId: 'e-104',
    actualOutcomeDescription: 'High price point ($3,499), weight ergonomics, and lack of killer app ecosystem resulted in estimated Year 1 sales of ~320,000 units.',
    deviationMetric: 'adoption',
    deviationValue: 'missed_expectations',
    hindsightLesson: 'Emerging technology hardware form factors cannot scale on premium pricing alone; ecosystem developer maturity is a prerequisite for consumer mass market penetration.',
    severity: 'critical',
    timestamp: '2025-01-20T10:00:00Z'
  },
  {
    id: 'h-5',
    companyId: 'tsla',
    companyName: 'Tesla, Inc.',
    expectationDescription: 'FSD V12 achieves fully driverless regulatory approval in California by early 2025.',
    expectedTimeline: 'Q1 2025',
    actualEventId: 'e-105',
    actualOutcomeDescription: 'FSD V12 (end-to-end neural network) vastly improved driving smoothness, but edge-case intervention rates (1 per 120 miles) remain too high for driverless certification.',
    deviationMetric: 'timeline',
    deviationValue: 'lagging',
    hindsightLesson: 'End-to-end neural networks exhibit black-box debug limits. Improving system reliability from 99% to 99.999% requires exponentially more diverse edge training data and hybrid safety-critical rule overlays.',
    severity: 'critical',
    timestamp: '2025-03-10T16:00:00Z'
  }
];

export const initialMarketEvents: MarketEvent[] = [
  {
    id: 'e-1',
    timestamp: '1 hour ago',
    companyId: 'nvda',
    companyName: 'NVIDIA Corporation',
    title: 'TSMC expands CoWoS packaging capacity by 50%',
    content: 'TSMC announced it is accelerating the conversion of existing tooling to CoWoS-L capacity to support Blackwell B200 and Ultra GPU assembly. Supply is expected to match demand 2 months ahead of schedule.',
    impactType: 'positive',
    metricImpacted: 'revenue',
    valueChange: 12,
    rawSource: 'News'
  },
  {
    id: 'e-2',
    timestamp: '4 hours ago',
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    title: 'iOS 19 beta includes advanced "Agentic AI" workflows',
    content: 'Developer betas of iOS 19 reveal a highly integrated neural framework allowing local LLMs to execute cross-app browser and tool invocations, addressing a major developer complaint.',
    impactType: 'positive',
    metricImpacted: 'growth',
    valueChange: 8,
    rawSource: 'Product Release'
  },
  {
    id: 'e-3',
    timestamp: '1 day ago',
    companyId: 'tsla',
    companyName: 'Tesla, Inc.',
    title: 'Megapack contract signed for Australian 2.4GWh grid expansion',
    content: 'Tesla Energy secured its largest grid contract to date in Victoria, Australia, securing production output for Lathrop factory through Q3 2026. This offsets flat automotive deliveries.',
    impactType: 'positive',
    metricImpacted: 'margin',
    valueChange: 15,
    rawSource: 'SEC Filing'
  },
  {
    id: 'e-4',
    timestamp: '2 days ago',
    companyId: 'msft',
    companyName: 'Microsoft Corporation',
    title: 'European Commission opens probe into Teams bundling',
    content: 'Regulators in Brussels have formally filed a statement of objections regarding Microsoft bundling Teams with cloud products, threatening a fine of up to 5% of global revenue.',
    impactType: 'negative',
    metricImpacted: 'regulatory',
    valueChange: -4,
    rawSource: 'Regulatory Body'
  }
];

export const initialMemoryNodes: MemoryNode[] = [
  // Sector Nodes
  { id: 'sec-semi', label: 'Semiconductors Sector', group: 'sector', detail: 'Foundational hardware node representing global microchip supply, packaging, and design ecosystems.', importance: 8 },
  { id: 'sec-consumer', label: 'Consumer Technology Sector', group: 'sector', detail: 'Mobile hardware, spatial computing, on-device software, and digital services ecosystem.', importance: 8 },
  { id: 'sec-auto', label: 'Automotive & Mobility Sector', group: 'sector', detail: 'Electric vehicles, autonomous drive systems, power electronics, and high-capital manufacturing.', importance: 7 },
  { id: 'sec-software', label: 'Software & Cloud Sector', group: 'sector', detail: 'Enterprise SaaS, hyperscale cloud services, and AI training infrastructure.', importance: 8 },

  // Company Nodes
  { id: 'co-nvda', label: 'NVIDIA Corporation', group: 'company', detail: 'Market leader in AI datacenter accelerators and software.', importance: 9 },
  { id: 'co-aapl', label: 'Apple Inc.', group: 'company', detail: 'Premium hardware orchestrator with high user ecosystem lock-in.', importance: 9 },
  { id: 'co-tsla', label: 'Tesla Inc.', group: 'company', detail: 'Pioneer of high-scale EV manufacturing and automated robotics.', importance: 8 },
  { id: 'co-msft', label: 'Microsoft Corp.', group: 'company', detail: 'Hyperscale cloud supplier and major investor in OpenAI.', importance: 9 },
  { id: 'co-googl', label: 'Alphabet Inc.', group: 'company', detail: 'Search monopoly and cloud platform provider powering Gemini.', importance: 9 },
  { id: 'co-amzn', label: 'Amazon.com Inc.', group: 'company', detail: 'Global logistics and e-commerce giant scaling AWS infrastructure.', importance: 9 },

  // Product Nodes
  { id: 'prod-blackwell', label: 'Blackwell B200 GPU', group: 'product', detail: 'NVIDIA next-generation silicon utilizing multi-die CoWoS packaging.', importance: 7 },
  { id: 'prod-vision', label: 'Apple Vision Pro', group: 'product', detail: 'Apple first-generation spatial computing hardware ($3,499).', importance: 5 },
  { id: 'prod-fsd', label: 'Tesla Full Self-Driving', group: 'product', detail: 'Tesla FSD end-to-end neural network autonomy package.', importance: 6 },
  { id: 'prod-azure-ai', label: 'Azure AI Platform', group: 'product', detail: 'Microsoft commercial AI services running on OpenAI models.', importance: 7 },
  { id: 'prod-gemini', label: 'Gemini AI models', group: 'product', detail: 'Google suite of multi-modal generative models (Pro and Flash).', importance: 7 },
  { id: 'prod-rufus', label: 'Rufus AI Shopping Assistant', group: 'product', detail: 'Amazon local agent optimizing conversion pipelines.', importance: 6 },

  // Hindsight Lesson Nodes
  { id: 'less-packaging-risk', label: 'Advanced Packaging Bottleneck', group: 'hindsight_lesson', detail: 'lesson: CoWoS-L bridge packaging design limits initial production yields on next-gen silicon.', importance: 6 },
  { id: 'less-eco-dev-lock', label: 'Developer-First Ecosystems', group: 'hindsight_lesson', detail: 'lesson: Premium consumer hardware requires active developer utility before consumer scale is possible.', importance: 5 },
  { id: 'less-auto-margins', label: 'Automotive Supply Traps', group: 'hindsight_lesson', detail: 'lesson: High-capital, low-margin automotive lines contradict asset-light premium models.', importance: 6 },
  { id: 'less-safety-verification', label: 'Autonomy Validation Limits', group: 'hindsight_lesson', detail: 'lesson: Safety-critical certs require hybrid rules overlays rather than purely black-box networks.', importance: 6 }
];

export const initialMemoryEdges: MemoryEdge[] = [
  // Sector connections
  { id: 'e-nvda-semi', source: 'co-nvda', target: 'sec-semi', label: 'belongs_to', weight: 5, type: 'belongs_to' },
  { id: 'e-aapl-consumer', source: 'co-aapl', target: 'sec-consumer', label: 'belongs_to', weight: 5, type: 'belongs_to' },
  { id: 'e-tsla-auto', source: 'co-tsla', target: 'sec-auto', label: 'belongs_to', weight: 5, type: 'belongs_to' },
  { id: 'e-msft-soft', source: 'co-msft', target: 'sec-software', label: 'belongs_to', weight: 5, type: 'belongs_to' },
  { id: 'e-googl-soft', source: 'co-googl', target: 'sec-software', label: 'belongs_to', weight: 5, type: 'belongs_to' },
  { id: 'e-amzn-consumer', source: 'co-amzn', target: 'sec-consumer', label: 'belongs_to', weight: 5, type: 'belongs_to' },

  // Product connections
  { id: 'e-nvda-blackwell', source: 'co-nvda', target: 'prod-blackwell', label: 'owns', weight: 4, type: 'belongs_to' },
  { id: 'e-aapl-vision', source: 'co-aapl', target: 'prod-vision', label: 'owns', weight: 4, type: 'belongs_to' },
  { id: 'e-tsla-fsd', source: 'co-tsla', target: 'prod-fsd', label: 'owns', weight: 4, type: 'belongs_to' },
  { id: 'e-msft-azure', source: 'co-msft', target: 'prod-azure-ai', label: 'owns', weight: 4, type: 'belongs_to' },
  { id: 'e-googl-gemini', source: 'co-googl', target: 'prod-gemini', label: 'owns', weight: 4, type: 'belongs_to' },
  { id: 'e-amzn-rufus', source: 'co-amzn', target: 'prod-rufus', label: 'owns', weight: 4, type: 'belongs_to' },

  // Hardware connection
  { id: 'e-blackwell-semi', source: 'prod-blackwell', target: 'sec-semi', label: 'impacts', weight: 4, type: 'impacts' },
  { id: 'e-gemini-soft', source: 'prod-gemini', target: 'sec-software', label: 'impacts', weight: 4, type: 'impacts' },
  { id: 'e-rufus-consumer', source: 'prod-rufus', target: 'sec-consumer', label: 'impacts', weight: 4, type: 'impacts' },

  // Hindsight connections
  { id: 'e-blackwell-lesson', source: 'prod-blackwell', target: 'less-packaging-risk', label: 'triggers', weight: 4, type: 'triggers' },
  { id: 'e-vision-lesson', source: 'prod-vision', target: 'less-eco-dev-lock', label: 'triggers', weight: 4, type: 'triggers' },
  { id: 'e-titan-lesson', source: 'co-aapl', target: 'less-auto-margins', label: 'triggers', weight: 3, type: 'triggers' },
  { id: 'e-fsd-lesson', source: 'prod-fsd', target: 'less-safety-verification', label: 'triggers', weight: 4, type: 'triggers' },

  // Contradiction/Cross-links
  { id: 'e-titan-tsla', source: 'less-auto-margins', target: 'co-tsla', label: 'impacts', weight: 3, type: 'impacts' }
];

export const simulationEventPool: Omit<MarketEvent, 'id' | 'timestamp'>[] = [
  {
    companyId: 'nvda',
    companyName: 'NVIDIA Corporation',
    title: 'Microsoft details Custom Cobalt 100 CPU server rollouts',
    content: 'Microsoft announces deployment of its in-house ARM-based Cobalt CPUs inside Azure datacenters. While targeting basic workloads, it signals cloud operators trying to reduce reliance on NVIDIA CPUs.',
    impactType: 'neutral',
    metricImpacted: 'marketShare',
    valueChange: -2,
    rawSource: 'SEC Filing'
  },
  {
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    title: 'Apple releases lightweight OpenELM model family on HuggingFace',
    content: 'Apple surprises developers by open-sourcing lightweight, high-performance models designed specifically to run locally on resource-constrained devices, cementing local agent capability.',
    impactType: 'positive',
    metricImpacted: 'growth',
    valueChange: 5,
    rawSource: 'Product Release'
  },
  {
    companyId: 'tsla',
    companyName: 'Tesla, Inc.',
    title: 'NHTSA expands Tesla Autopilot safety probe',
    content: 'Federal safety regulators demand logs and engineering blueprints following reports of phantom braking events on FSD V12 firmware on highways, escalating compliance risks.',
    impactType: 'negative',
    metricImpacted: 'regulatory',
    valueChange: -8,
    rawSource: 'Regulatory Body'
  },
  {
    companyId: 'msft',
    companyName: 'Microsoft Corporation',
    title: 'Azure logs 31% YoY AI cloud revenue growth in earnings call',
    content: 'Microsoft reports spectacular Q3 results where Azure and other cloud services grew 31%, heavily driven by generative AI subscription demand, outpacing market expectations.',
    impactType: 'positive',
    metricImpacted: 'revenue',
    valueChange: 10,
    rawSource: 'Earnings Call'
  },
  {
    companyId: 'nvda',
    companyName: 'NVIDIA Corporation',
    title: 'Reports of Blackwell B200 server rack overheating issues surface',
    content: 'Industry reports note that liquid-cooling plumbing inside 72-GPU Blackwell NVL72 cabinets requires manifold refitting by Vertiv, raising concerns about deployment delays.',
    impactType: 'negative',
    metricImpacted: 'margin',
    valueChange: -6,
    rawSource: 'News'
  },
  {
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    title: 'WWDC details Siri upgrade backed by server-side private clouds',
    content: 'Apple showcases dynamic routing where complex agent instructions are sent to Private Cloud Compute nodes running on Apple Silicon, securing user privacy while executing heavy reasoning tasks.',
    impactType: 'positive',
    metricImpacted: 'brand',
    valueChange: 7,
    rawSource: 'Product Release'
  },
  {
    companyId: 'tsla',
    companyName: 'Tesla, Inc.',
    title: 'Tesla reports vehicle sales drop by 8.5% in quarterly report',
    content: 'Tesla reports quarterly deliveries of 386,810 vehicles, missing consensus estimates by a wide margin. Price cuts in China fail to stimulate volume amid intense local competition.',
    impactType: 'negative',
    metricImpacted: 'revenue',
    valueChange: -12,
    rawSource: 'Earnings Call'
  },
  {
    companyId: 'msft',
    companyName: 'Microsoft Corporation',
    title: 'Microsoft introduces Recall AI feature, sparks security uproar',
    content: 'Microsoft announces standard AI PC feature taking screenshot intervals of user activity. Backlash from cybersecurity researchers forces Microsoft to make it strictly opt-in, damaging launch momentum.',
    impactType: 'negative',
    metricImpacted: 'brand',
    valueChange: -5,
    rawSource: 'Product Release'
  }
];

export const mockMemos: InvestmentMemo[] = [
  {
    id: 'memo-nvda-01',
    companyId: 'nvda',
    companyName: 'NVIDIA Corporation',
    ticker: 'NVDA',
    title: 'Blackwell Scalability & Packaging Risk Adjustment',
    timestamp: '2026-05-12T14:30:00Z',
    recommendation: 'BUY',
    convictionScore: 8,
    keyThesis: 'Despite initial 90-day packaging setbacks due to CoWoS-L design revisions, demand remains insatiable. Supply expansion by TSMC will unlock massive deferred revenue streams.',
    hindsightInsights: [
      'Advanced Packaging yield bottlenecks are structural to sub-3nm chip nodes. Standard margins will recover from 71% back to 76% as fab yields mature.',
      'Software barrier (CUDA) remains the ultimate moat, blocking competitive inroads from custom ASIC designs.'
    ],
    riskAnalysis: 'Packaging yield consistency remains the primary single point of failure. Overreliance on TSMC facilities in Taiwan leaves geopolitical vulnerabilities.',
    growthOutlook: 'Datacenter segment projected to expand by another 35% in FY27 as hyperscalers build cluster nodes of 100k+ GPUs.',
    fullMemo: `### Executive Summary
We maintain a BUY recommendation on NVIDIA Corporation (NVDA) with a high conviction score of 8/10. Recent event tracking confirms that the Blackwell B200 packaging bottleneck has been resolved.

### Core Investment Thesis
1. **Unlocking Blackwell Backlog**: The 50% increase in TSMC's CoWoS capacity immediately unlocks delivery of the B200 GPU cluster orders. 
2. **The CUDA Software Moat**: Competitors like AMD and cloud-provider custom silicon (Cobalt, TPU) are struggling to match CUDA's developer ecosystem density. 
3. **Margins Resiliency**: Net margins are projected to stabilize above 55% as yield learning curves optimize.

### Hindsight Learnings Integrated
Our system previously failed to budget for the mechanical strain limits of TSMC's CoWoS-L bridge design. We have integrated a permanent "Advanced Packaging Redundancy Buffer" of 120 days into our hardware timelines. 

### Key Risks
- **Supply Concentration**: 100% of high-end GPU assembly is centralized in Taiwan.
- **Hyperscaler CapEx Fatigue**: If cloud operators do not see corresponding software revenue growth, they may scale down infrastructure spends by late 2027.`
  },
  {
    id: 'memo-aapl-01',
    companyId: 'aapl',
    companyName: 'Apple Inc.',
    ticker: 'AAPL',
    title: 'Pivoting from Spatial Hardware to Edge Agent Architecture',
    timestamp: '2026-05-20T11:00:00Z',
    recommendation: 'HOLD',
    convictionScore: 6,
    keyThesis: 'The commercial disappointment of Apple Vision Pro (320k vs 1M units) is offset by rapid local AI rollout. On-device agent capabilities will trigger a replacement cycle, though consumer hardware growth remains modest.',
    hindsightInsights: [
      'Project Titan cancellation saved $2-3B in annual capital spend, redirecting key compute resources to iOS software platforms.',
      'First-generation spatial hardware cannot scale without a robust developer utility baseline.'
    ],
    riskAnalysis: 'Slower handset replacement cycles. Regulatory threats to the App Store billing structure in the US and Europe represent persistent headwinds.',
    growthOutlook: 'Services growth remains steady at 12-14% YoY, cushioning hardware cyclicality.',
    fullMemo: `### Executive Summary
We recommend a HOLD on Apple Inc. (AAPL) with a conviction score of 6/10. The company is transitioning from a hardware-volume growth story to a high-margin services and client-side agent network ecosystem.

### Core Investment Thesis
1. **On-Device Agent Monopolization**: iOS 19's local agent system positions Apple to control the user's primary interface to third-party web apps and LLMs.
2. **Capital Efficiency Recovery**: The abandonment of the EV program redirects capital to cloud nodes and on-device chip R&D.
3. **Recurring Services Moat**: App Store, iCloud, and financial services continue to grow as a percent of total revenue.

### Hindsight Learnings Integrated
We over-modeled the initial consumer demand for Apple Vision Pro. Our hindsight analysis shows that premium hardware form factors cannot create categories overnight without a prior developer toolchain. We have downgraded early-stage hardware expectations by 50% across the board.

### Key Risks
- **Antitrust Regulatory Fines**: Potential break-up or fee limitations on App Store transactions.
- **Hardware Stagnation**: Lack of screen/battery breakthrough to drive massive consumer upgrade urgency.`
  }
];
