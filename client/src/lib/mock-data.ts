
export interface GTMRecommendation {
  id: string;
  category: "Content" | "SEO" | "Outbound" | "Paid Ads" | "Community";
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
  status: "New" | "In Progress" | "Completed";
}

export interface WeeklyIdea {
  id: string;
  title: string;
  description: string;
  type: "Blog Post" | "LinkedIn" | "Email Campaign" | "Webinar";
  date: string;
}

export const mockCompany = {
  name: "TechFlow Solutions",
  url: "techflow.io",
  summary: "TechFlow provides an AI-powered workflow automation platform for enterprise logistics. It helps supply chain managers predict delays and optimize routes in real-time.",
  motion: "Enterprise Sales & Inbound Marketing",
};

export const mockRecommendations: GTMRecommendation[] = [
  {
    id: "1",
    category: "Content",
    title: "Supply Chain Resilience Whitepaper",
    description: "Publish a deep-dive whitepaper on 'The State of AI in Logistics 2025' to capture enterprise leads searching for modernization strategies.",
    impact: "High",
    effort: "High",
    status: "New",
  },
  {
    id: "2",
    category: "SEO",
    title: "Target 'Predictive Logistics' Keywords",
    description: "Optimize landing pages for high-intent keywords like 'predictive route optimization software' and 'AI supply chain analytics'.",
    impact: "High",
    effort: "Medium",
    status: "In Progress",
  },
  {
    id: "3",
    category: "Outbound",
    title: "Logistics Directors Outreach Sequence",
    description: "Launch a cold email campaign targeting Directors of Logistics at Fortune 1000 manufacturing companies.",
    impact: "Medium",
    effort: "Medium",
    status: "New",
  },
  {
    id: "4",
    category: "Community",
    title: "Sponsor 'Supply Chain Brain' Podcast",
    description: "Partner with a leading industry podcast to build brand awareness among decision makers.",
    impact: "Medium",
    effort: "Low",
    status: "New",
  },
];

export const mockWeeklyIdeas: WeeklyIdea[] = [
  {
    id: "1",
    title: "Case Study: How Client X saved 20% on fuel",
    description: "Draft a LinkedIn carousel breaking down a recent customer win. Focus on the ROI metrics.",
    type: "LinkedIn",
    date: "Nov 28, 2025",
  },
  {
    id: "2",
    title: "The Hidden Cost of Delays",
    description: "Write a blog post calculating the real cost of supply chain interruptions for manufacturers.",
    type: "Blog Post",
    date: "Nov 29, 2025",
  },
  {
    id: "3",
    title: "Q4 Logistics Planning Webinar",
    description: "Host a webinar on preparing supply chains for the holiday peak season.",
    type: "Webinar",
    date: "Dec 05, 2025",
  },
];
