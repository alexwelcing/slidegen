
import { SlideData } from '../types';

const createPlaceholderImage = (text: string, subtext: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1920, 1080);

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 1920; i += 100) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1080);
    ctx.stroke();
  }
  for (let i = 0; i < 1080; i += 100) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1920, i);
    ctx.stroke();
  }

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 960, 500);
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '40px Inter, sans-serif';
  ctx.fillText(subtext, 960, 600);

  return canvas.toDataURL('image/jpeg', 0.8);
};

export const createDemoDeck = (): SlideData[] => {
  const demoContent = [
    {
      title: "The Era of Agentic Engineering",
      subtitle: "Market Landscape 2026",
      layout: "minimal-centered",
      points: ["From Autocomplete to Autonomous Orchestration", "High-fidelity vector evolution", "Strategic Industry Analysis Q1 2026"]
    },
    {
      title: "The 2026 Ecosystem",
      subtitle: "An Agentic Stack Analysis",
      layout: "editorial-left",
      points: ["Vibe Coding: Rapid prototyping (Replit, Cursor)", "Industrial Engineering: Systemic architecture (Claude Code)", "Orchestration: Multi-Agent Swarms"]
    },
    {
      title: "The Smart Building",
      subtitle: "Cursor & The GUI Philosophy",
      layout: "editorial-right",
      points: ["Editor-First Philosophy", "Shadow Workspace Verification", "Turbopuffer Vector Search"]
    },
    {
      title: "The Industrial Studio",
      subtitle: "Claude Code & Headless Autonomy",
      layout: "editorial-left",
      points: ["Terminal-First Philosophy", "Deep Reasoning Agents", "Agentic Search Dependency Graphs"]
    },
    {
      title: "The Incumbents & Generators",
      subtitle: "GitHub Copilot vs Replit Agent",
      layout: "mckinsey-insight",
      points: ["Copilot: 60% boilerplate work, architectural blindness", "Replit: Idea-to-App, 200-minute loops", "Limitation: Browser Context vs Monorepos"]
    },
    {
      title: "Connective Tissue",
      subtitle: "Model Context Protocol (MCP)",
      layout: "minimal-centered",
      points: ["No Vendor Lock-in", "Programmatic Tool Calling", "Local Security & explicit permissions"]
    },
    {
      title: "Orchestration",
      subtitle: "The 'Gas Town' Metaphor",
      layout: "editorial-left",
      points: ["The Mayor (Dispatcher)", "Wisps vs Molecules (Durable workflows)", "Swarm Dynamics: Asynchronous Patrols"]
    },
    {
      title: "The Engine Room",
      subtitle: "Infrastructure & Economics",
      layout: "editorial-right",
      points: ["Local Edge: Mac Mini M4 Cluster", "Data Center: Nvidia DGX GB200", "KV Cache Transfer Optimization"]
    },
    {
      title: "Tech Stack Shift",
      subtitle: "Languages for Agents",
      layout: "minimal-centered",
      points: ["TypeScript: The Interface (Strong typing)", "Laravel/PHP: The Control (Durable workflows)", "Rust: The Metal (Memory safety)"]
    },
    {
      title: "Strategic Outlook",
      subtitle: "Convergence 2026",
      layout: "mckinsey-insight",
      points: ["Shift in Role: Writing -> Verifying", "Shift in Skill: Prompting -> Context Engineering", "Shift in Security: Secure by Default"]
    }
  ];

  return demoContent.map((c, i) => ({
    id: `demo-${i}`,
    pageIndex: i,
    originalImage: createPlaceholderImage(`Slide ${i + 1}: ${c.title}`, c.subtitle),
    status: 'complete',
    analysis: {
      actionTitle: c.title,
      subtitle: c.subtitle,
      keyTakeaways: c.points,
      script: `This slide discusses ${c.title}. Key points include ${c.points.join(', ')}.`,
      visualPrompt: `Abstract cinematic representation of ${c.title}, ${c.subtitle}, high tech, futuristic`,
      assetPrompts: [],
      keywords: c.title.split(' '),
      consultingLayout: c.layout as any,
      colorPalette: ['#ffffff', '#000000'],
      mood: 'Futuristic'
    }
  }));
};
