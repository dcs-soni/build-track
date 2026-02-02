import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  MapPin,
  Calendar,
  ChevronDown,
} from "lucide-react";

// --- PARALLAX HOOK ---
function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return offset;
}

// --- INTERSECTION OBSERVER HOOK ---
function useInView(threshold: number = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// --- PROJECT DATA ---
const projects = [
  {
    id: 1,
    title: "The Meridian Tower",
    location: "Manhattan, NY",
    year: "2026",
    category: "Commercial",
    image:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
    aspect: "16/9",
  },
  {
    id: 2,
    title: "Coastal Residence",
    location: "Malibu, CA",
    year: "2025",
    category: "Residential",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    aspect: "4/5",
  },
  {
    id: 3,
    title: "Urban Core Complex",
    location: "Chicago, IL",
    year: "2026",
    category: "Mixed-Use",
    image:
      "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80",
    aspect: "16/9",
  },
  {
    id: 4,
    title: "Skybridge Pavilion",
    location: "Seattle, WA",
    year: "2024",
    category: "Infrastructure",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    aspect: "4/5",
  },
];

const metrics = [
  { value: "$2.4B", label: "Assets Under Management" },
  { value: "147", label: "Completed Projects" },
  { value: "98%", label: "On-Time Delivery" },
  { value: "23", label: "Global Markets" },
];

// --- PROJECT CARD ---
function ProjectCard({
  project,
  index,
}: {
  project: (typeof projects)[0];
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden cursor-pointer animate-unveil`}
      style={{
        animationDelay: `${0.2 + index * 0.15}s`,
        aspectRatio: project.aspect,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="absolute inset-0 bg-[var(--graphite)]">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover grayscale-[30%] transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)]/80 via-transparent to-transparent" />
      </div>

      {/* Content - Always visible */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <p className="text-caption text-[var(--slate-light)] mb-2">
          {project.category}
        </p>
        <h3 className="text-xl md:text-2xl font-medium text-[var(--ivory)] tracking-tight mb-4">
          {project.title}
        </h3>

        {/* Coordinates - Appear on hover */}
        <div
          className="flex items-center gap-6 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <span className="flex items-center gap-2 text-caption">
            <MapPin className="w-3 h-3" />
            {project.location}
          </span>
          <span className="flex items-center gap-2 text-caption">
            <Calendar className="w-3 h-3" />
            {project.year}
          </span>
        </div>
      </div>

      {/* Arrow indicator */}
      <div
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center border border-[var(--ivory)]/20 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? "translate(0, 0)" : "translate(10px, -10px)",
        }}
      >
        <ArrowUpRight className="w-4 h-4 text-[var(--ivory)]" />
      </div>
    </div>
  );
}

// --- MAIN LANDING PAGE ---
export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const heroParallax = useParallax(0.3);
  const textParallax = useParallax(0.15);
  const legacySection = useInView(0.2);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--obsidian)]">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          scrolled ? "glass-panel py-4" : "py-6"
        }`}
      >
        <div className="container flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="w-10 h-10 border border-[var(--steel)] flex items-center justify-center transition-colors duration-500 group-hover:border-[var(--gold)]">
              <span className="text-[var(--ivory)] font-medium text-lg tracking-tighter">
                B
              </span>
            </div>
            <div className="hidden md:block">
              <span className="text-[var(--ivory)] font-medium tracking-tight">
                BuildTrack
              </span>
              <span className="block text-caption mt-0.5">
                Construction Intelligence
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-12">
            {["Projects", "Capabilities", "About", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-[var(--concrete)] hover:text-[var(--ivory)] transition-colors duration-500 tracking-wide"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-6">
            <Link
              to="/login"
              className="hidden md:block text-sm text-[var(--concrete)] hover:text-[var(--ivory)] transition-colors duration-500 tracking-wide"
            >
              Sign In
            </Link>
            <Link to="/register" className="btn-gold">
              Start Project
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-end pt-32 pb-24 overflow-hidden">
        {/* Background Image with Parallax */}
        <div
          className="absolute inset-0 animate-fade"
          style={{ transform: `translateY(${heroParallax}px)` }}
        >
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80"
            alt="Architectural visualization"
            className="w-full h-[120%] object-cover grayscale-[50%] opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--obsidian)] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="container relative z-10">
          <div className="grid-12">
            {/* Main headline - spans 8 columns */}
            <div
              className="col-span-12 lg:col-span-8 xl:col-span-7"
              style={{ transform: `translateY(${textParallax}px)` }}
            >
              <p className="text-subhead mb-8 animate-unveil">
                Construction Intelligence Platform
              </p>

              <h1 className="text-display text-[var(--ivory)] mb-8 animate-unveil delay-200">
                Building
                <br />
                Tomorrow's
                <br />
                <span className="text-[var(--gold)]">Legacy</span>
              </h1>

              <p className="text-body max-w-lg mb-12 animate-unveil delay-400">
                We orchestrate complex construction projects with precision,
                leveraging AI-driven insights to deliver exceptional outcomes
                for discerning institutional investors.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-6 animate-unveil delay-600">
                <Link to="/register" className="btn-primary group">
                  <span>Begin Your Project</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                <button className="btn-primary group">
                  <Play className="w-4 h-4" />
                  <span>View Showreel</span>
                </button>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="col-span-12 mt-16 animate-unveil delay-800">
              <div className="flex items-center gap-4">
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[var(--steel)] to-transparent" />
                <div className="flex flex-col items-center">
                  <ChevronDown className="w-4 h-4 text-[var(--slate-light)] animate-bounce" />
                  <span className="text-caption mt-2">Scroll</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-16 border-y border-[var(--titanium)]">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-[var(--titanium)]">
            {metrics.map((metric, i) => (
              <div key={i} className="text-center md:px-8">
                <div className="text-3xl md:text-4xl font-medium text-[var(--ivory)] tracking-tight mb-2">
                  {metric.value}
                </div>
                <div className="text-caption">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section - Asymmetric Masonry */}
      <section id="projects" className="py-32">
        <div className="container">
          {/* Section Header */}
          <div className="grid-12 mb-16">
            <div className="col-span-12 lg:col-span-6">
              <p className="text-subhead mb-4">Selected Works</p>
              <h2 className="text-headline text-[var(--ivory)]">
                A Portfolio of
                <br />
                Architectural Excellence
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:col-start-9 flex items-end">
              <p className="text-body">
                Each project represents our commitment to precision engineering
                and timeless design principles.
              </p>
            </div>
          </div>

          {/* Asymmetric Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Row 1: Large + Small */}
            <div className="md:col-span-1">
              <ProjectCard project={projects[0]} index={0} />
            </div>
            <div className="md:col-span-1">
              <ProjectCard project={projects[1]} index={1} />
            </div>

            {/* Row 2: Small + Large */}
            <div className="md:col-span-1">
              <ProjectCard project={projects[3]} index={2} />
            </div>
            <div className="md:col-span-1">
              <ProjectCard project={projects[2]} index={3} />
            </div>
          </div>

          {/* View All Link */}
          <div className="mt-16 text-center">
            <Link to="/projects" className="btn-primary inline-flex">
              <span>View All Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Our Approach - Architectural Statement */}
      <section
        ref={legacySection.ref}
        className="relative py-40 bg-[var(--carbon)] overflow-hidden"
      >
        {/* Architectural Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-px h-full bg-[var(--titanium)]/30" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-[var(--titanium)]/30" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-[var(--titanium)]/30" />
        </div>

        <div className="container relative">
          {/* Section Header - Dramatic Typography */}
          <div className="mb-32">
            <div className="flex items-end gap-8 mb-8">
              <span className="text-[12rem] md:text-[16rem] font-medium leading-none text-[var(--titanium)]/40 tracking-tighter select-none">
                A
              </span>
              <div className="pb-8">
                <p className="text-subhead mb-4 text-[var(--gold)]">
                  Methodology
                </p>
                <h2 className="text-4xl md:text-6xl font-medium text-[var(--ivory)] tracking-tight leading-none">
                  Our Approach
                </h2>
              </div>
            </div>
            <div className="max-w-xl ml-auto">
              <p className="text-body text-[var(--concrete)]/80 text-right">
                A systematic methodology refined through 147 completed projects
                and $2.4B in managed assets.
              </p>
            </div>
          </div>

          {/* Asymmetric Feature Blocks */}
          <div className="space-y-0">
            {[
              {
                number: "01",
                title: "Predictive Intelligence",
                subtitle: "Foresight, Not Hindsight",
                description:
                  "Our AI models analyze 2,400+ project variables to forecast delays, budget variances, and resource constraints—weeks before they manifest. Proactive intervention, not reactive firefighting.",
                metric: "94%",
                metricLabel: "Forecast Accuracy",
              },
              {
                number: "02",
                title: "Unified Command",
                subtitle: "One Source of Truth",
                description:
                  "Architects, contractors, investors, and project managers operate from a single synchronized platform. Every document, every decision, every dollar—tracked in real-time.",
                metric: "3.2x",
                metricLabel: "Faster Decisions",
              },
              {
                number: "03",
                title: "Radical Transparency",
                subtitle: "Every Metric, Every Moment",
                description:
                  "Institutional-grade dashboards provide granular visibility into every phase. From foundation to finishing, nothing is obscured. Trust through total transparency.",
                metric: "100%",
                metricLabel: "Data Visibility",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`group relative border-t border-[var(--titanium)]/50 transition-all duration-700 ${
                  legacySection.isInView ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: `${i * 0.2}s` }}
              >
                {/* Hover Background */}
                <div className="absolute inset-0 bg-[var(--graphite)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative py-16 grid grid-cols-12 gap-8 items-start">
                  {/* Large Number */}
                  <div className="col-span-12 md:col-span-2">
                    <span className="text-7xl md:text-8xl font-medium text-[var(--titanium)]/60 group-hover:text-[var(--gold)]/40 transition-colors duration-700 tracking-tighter">
                      {item.number}
                    </span>
                  </div>

                  {/* Title Block */}
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-caption text-[var(--gold)] mb-3">
                      {item.subtitle}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-medium text-[var(--ivory)] tracking-tight group-hover:translate-x-2 transition-transform duration-500">
                      {item.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-body text-[var(--concrete)]/80 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Metric */}
                  <div className="col-span-12 md:col-span-2 md:text-right">
                    <div className="inline-block md:block">
                      <span className="text-4xl md:text-5xl font-medium text-[var(--ivory)] tracking-tight">
                        {item.metric}
                      </span>
                      <p className="text-caption mt-2">{item.metricLabel}</p>
                    </div>
                  </div>
                </div>

                {/* Gold accent line on hover */}
                <div className="absolute top-0 left-0 w-0 h-px bg-[var(--gold)] group-hover:w-32 transition-all duration-700" />
              </div>
            ))}
          </div>

          {/* Bottom Divider */}
          <div className="border-t border-[var(--titanium)]/50" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Subtle architectural grid background */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 100px, var(--steel) 100px, var(--steel) 101px),
                              repeating-linear-gradient(90deg, transparent, transparent 100px, var(--steel) 100px, var(--steel) 101px)`,
            }}
          />
        </div>

        <div className="container relative z-10">
          <div className="grid-12">
            <div className="col-span-12 lg:col-span-8 lg:col-start-3 text-center">
              <p className="text-subhead mb-6">Start Your Journey</p>
              <h2 className="text-display text-[var(--ivory)] mb-8">
                Ready to Build
                <br />
                <span className="text-[var(--gold)]">
                  Something Extraordinary?
                </span>
              </h2>
              <p className="text-body max-w-2xl mx-auto mb-12">
                Join the platform trusted by leading developers, institutional
                investors, and construction firms worldwide.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/register" className="btn-gold">
                  <span>Schedule Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-primary">
                  <span>Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-[var(--titanium)]">
        <div className="container">
          <div className="grid-12">
            {/* Logo & Tagline */}
            <div className="col-span-12 md:col-span-4 mb-12 md:mb-0">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 border border-[var(--steel)] flex items-center justify-center">
                  <span className="text-[var(--ivory)] font-medium text-lg tracking-tighter">
                    B
                  </span>
                </div>
                <span className="text-[var(--ivory)] font-medium tracking-tight">
                  BuildTrack
                </span>
              </div>
              <p className="text-sm text-[var(--slate-light)] max-w-xs">
                The intelligence platform for sophisticated construction
                management.
              </p>
            </div>

            {/* Links */}
            <div className="col-span-6 md:col-span-2">
              <p className="text-caption mb-6">Platform</p>
              <ul className="space-y-3">
                {["Features", "Pricing", "Security", "Integrations"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-[var(--concrete)] hover:text-[var(--ivory)] transition-colors duration-300"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="col-span-6 md:col-span-2">
              <p className="text-caption mb-6">Company</p>
              <ul className="space-y-3">
                {["About", "Careers", "Press", "Contact"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-[var(--concrete)] hover:text-[var(--ivory)] transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-12 md:col-span-4 md:text-right">
              <p className="text-caption mb-6">Connect</p>
              <a
                href="mailto:inquiries@buildtrack.com"
                className="text-sm text-[var(--gold)] hover:text-[var(--ivory)] transition-colors duration-300"
              >
                inquiries@buildtrack.com
              </a>
            </div>
          </div>

          <hr className="divider my-12" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-caption">
              © 2026 BuildTrack. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <a
                href="#"
                className="text-caption hover:text-[var(--ivory)] transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-caption hover:text-[var(--ivory)] transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-caption hover:text-[var(--ivory)] transition-colors"
              >
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
