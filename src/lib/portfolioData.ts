import { SkillItem, ProjectItem, TimelineItem } from '@/types/portfolio';

export const initialSkills: SkillItem[] = [
  { n: 'JavaScript', i: 'JS', c: '#f0db4f', t: '#2b2200' },
  { n: 'React.js', i: 'Re', c: '#61dafb', t: '#062330' },
  { n: 'Next.js', i: 'N', c: '#e9e9f0', t: '#0a0a0f' },
  { n: 'Node.js', i: 'Nd', c: '#3c873a', t: '#ffffff' },
  { n: 'Express.js', i: 'Ex', c: '#8a8a9a', t: '#0a0a0f' },
  { n: 'MongoDB', i: 'Mo', c: '#47A248', t: '#ffffff' },
  { n: 'SQL', i: 'SQL', c: '#00618a', t: '#ffffff' },
  { n: 'Tailwind CSS', i: 'Tw', c: '#38bdf8', t: '#04303f' },
  { n: 'Bootstrap', i: 'Bs', c: '#7952b3', t: '#ffffff' },
  { n: 'Material UI', i: 'MU', c: '#007fff', t: '#ffffff' },
  { n: 'Socket.io', i: 'Sk', c: '#e9e9f0', t: '#0a0a0f' },
  { n: 'JWT / bcrypt.js', i: 'JWT', c: '#d63aff', t: '#2a0033' },
  { n: 'LangChain.js', i: 'LC', c: '#1c3c3c', t: '#9fe1cb' },
  { n: 'n8n', i: 'n8n', c: '#ea4b71', t: '#ffffff' },
  { n: 'Prompt engineering', i: 'PE', c: '#7c5cff', t: '#ffffff' },
  { n: 'Docker', i: 'Dk', c: '#2496ED', t: '#ffffff' },
  { n: 'Git / GitHub', i: 'Git', c: '#f05033', t: '#ffffff' },
  { n: 'Postman', i: 'Pm', c: '#ff6c37', t: '#2a0e00' }
];

export const initialProjects: ProjectItem[] = [
  { name: 'Zerodha — stock trading platform', meta: 'JavaScript · real-time market data', desc: 'A full-stack trading ecosystem mimicking Zerodha Kite, with live market data, trade execution, and portfolio analytics.', url: 'https://chiranjeeb-dash-git.github.io/Zerodha-/' },
  { name: 'QuantumQuery AI agent', meta: 'Next.js · LangChain.js · TypeScript', desc: 'An agentic app where the AI autonomously decides between internal knowledge and live web search for real-time answers.', url: 'https://quantum-query-ai-agent.vercel.app/' },
  { name: 'Full-stack GenAI assistant', meta: 'Next.js · Express · JavaScript', desc: 'A production-ready AI assistant with multi-model LLM routing, real-time streaming, and STT/TTS voice integration.', url: 'https://full-stack-gen-ai-assistant.vercel.app/' },
  { name: 'Airbnb — global stay network', meta: 'Node · Express · MongoDB · EJS', desc: 'A rental platform replicating Airbnb, with property listings, image uploads, interactive maps, and bookings.', url: 'https://airbnb-global-stay-network.onrender.com/' },
  { name: 'Social media platform', meta: 'Next.js · Express · TypeScript', desc: 'A Reddit-style clone with posts, communities, voting, comments, and user auth.', url: 'https://social-media-platform-azure-ten.vercel.app/' },
  { name: 'Document manager', meta: 'Next.js', desc: 'A full-stack document management and organization tool.', url: 'https://document-manager-quo8.vercel.app/' },
  { name: 'Smart ERP platform', meta: 'Next.js', desc: 'A smart ERP-style management platform.', url: 'https://smart-naff5gjfr-chiranjeeb-dash-gits-projects.vercel.app/' },
  { name: 'Insurance platform', meta: 'React', desc: 'A full-stack insurance platform with policy browsing and management.', url: 'https://insuranceplatform-rho.vercel.app/' }
];

export const initialExperience: TimelineItem[] = [
  { title: 'Software development trainee, full stack MERN', meta: 'Apna College, 10/2024 — 04/2025' },
  { title: 'Web development intern', meta: 'Mentornix Pvt Ltd' },
  { title: 'Full stack web development intern', meta: 'Octanet Services Pvt Ltd' }
];

export const initialEducation: TimelineItem[] = [
  { title: 'B.Tech, Computer Science and Engineering', meta: 'Biju Patnaik University of Technology, Odisha · 2022 — 2024' },
  { title: 'Diploma engineering', meta: 'Central Institute of Petrochemical Engineering and Technology · 2019 — 2021' }
];

export const initialCertificates: string[] = [
  'Full stack web development — MERN stack',
  'Web development internship',
  'Production AI agents with JavaScript: LangChain and LangGraph'
];
