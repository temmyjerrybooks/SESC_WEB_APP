import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CirclePlay,
  Globe2,
  HandHeart,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  UsersRound,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";
import { HomeCountdown } from "@/components/home-countdown";

const membershipBenefits = [
  {
    icon: BadgeCheck,
    title: "Official recognition",
    copy: "A verified membership profile and digital card once your application and payment are approved.",
  },
  {
    icon: Globe2,
    title: "Connected chapters",
    copy: "Find your supporter community at home or abroad through an approved chapter directory.",
  },
  {
    icon: Ticket,
    title: "Member opportunities",
    copy: "Receive authorised notices for events, matchday activity, travel and club initiatives.",
  },
];

const newsItems = [
  {
    category: "Platform update",
    title: "A digital home built for every Eagles supporter.",
    copy: "Explore the structure of the new SESC platform and the services that are being introduced.",
    href: "/news/editorial-club-update-demo",
  },
  {
    category: "Community",
    title: "Chapters will have a clearer way to connect.",
    copy: "A dedicated directory and chapter spaces are being prepared for verified local and international communities.",
    href: "/chapters",
  },
  {
    category: "Membership",
    title: "Your route to verified membership starts here.",
    copy: "Explore the membership journey and watch for approved application availability.",
    href: "/membership",
  },
];

export function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div aria-hidden="true" className="home-hero__stadium" />
        <div aria-hidden="true" className="home-hero__slash" />
        <div className="home-hero__content page-shell">
          <p className="eyebrow">Official digital headquarters</p>
          <h1>
            The voice behind <span>the Eagles.</span>
          </h1>
          <p className="home-hero__copy">
            A new home for supporters who carry Nigerian football in their hearts — connecting people, chapters,
            matchdays and meaningful community action.
          </p>
          <div className="button-row">
            <Link className="button button--primary" href="/membership">
              Explore membership <ArrowRight size={16} />
            </Link>
            <Link className="button button--secondary" href="/about">
              Discover the Club
            </Link>
          </div>
          <div className="home-hero__trust">
            <span><ShieldCheck size={17} /> Secure, reviewed membership</span>
            <span><UsersRound size={17} /> Built for local &amp; global chapters</span>
          </div>
        </div>
        <div className="home-hero__signal" aria-hidden="true">
          <span />
          <p>Scroll to explore</p>
        </div>
      </section>

      <section className="home-match section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Match Centre</p>
            <h2>Every matchday, one place to rally.</h2>
          </div>
          <Link className="section-heading__link" href="/match-centre">Open Match Centre <ChevronRight size={16} /></Link>
        </div>
        <div className="match-card">
          <div className="match-card__side match-card__side--home">
            <span className="tag">Supporters&apos; update</span>
            <strong>Super Eagles</strong>
            <p>Official fixture, travel and gathering details are shared only after confirmation.</p>
          </div>
          <div className="match-card__middle">
            <span className="match-card__orb"><CirclePlay size={25} /></span>
            <strong>Matchday hub</strong>
            <small>Updates pending</small>
          </div>
          <div className="match-card__side match-card__side--away">
            <span className="tag tag--gold">Verified information</span>
            <strong>Stay ready</strong>
            <p>Save the Match Centre for authorised club notices, calendar updates and supporter guidance.</p>
          </div>
        </div>
      </section>

      <section className="section section--surface home-story">
        <div className="home-story__layout">
          <div className="home-story__visual" aria-label="Supporters in a stadium" role="img">
            <div className="home-story__badge"><Sparkles size={20} /> A shared standard</div>
          </div>
          <div className="home-story__copy">
            <p className="eyebrow">More than a crowd</p>
            <h2>We turn the energy in the stands into a community with purpose.</h2>
            <p>
              SESC brings supporters together around Nigerian football through a trusted membership pathway, stronger
              chapter connections, responsible communications, and moments worth celebrating.
            </p>
            <p>
              This platform has been designed to give every authorised member and administrator a clearer, more
              secure way to take part.
            </p>
            <Link className="button button--ghost" href="/about">Our story <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="section home-benefits">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Membership</p>
            <h2>Made for the supporters who show up.</h2>
            <p>Membership approval is deliberate: apply, provide payment evidence, and await authorised verification.</p>
          </div>
          <Link className="section-heading__link" href="/membership">Explore membership <ChevronRight size={16} /></Link>
        </div>
        <div className="benefit-grid">
          {membershipBenefits.map(({ icon: Icon, title, copy }, index) => (
            <article className="benefit-card" key={title}>
              <span className="benefit-card__number">0{index + 1}</span>
              <span className="benefit-card__icon"><Icon size={25} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-gala">
        <div className="gala-panel">
          <div className="gala-panel__content">
            <p className="eyebrow">Save the date · 2026</p>
            <h2>Super Eagles Supporters Club of Nigeria Awards &amp; Gala Night</h2>
            <p className="gala-panel__date"><CalendarDays size={18} /> Friday, 30 October 2026 · Four Points by Sheraton Lagos, Victoria Island</p>
            <p>
              A ceremonial evening for the supporters&apos; community. Programme, guest, sponsorship and invitation
              information will be published by authorised club editors.
            </p>
            <Link className="button button--secondary" href="/awards-gala">Explore the Gala <Trophy size={16} /></Link>
          </div>
          <HomeCountdown />
        </div>
      </section>

      <section className="section home-news">
        <div className="section-heading">
          <div>
            <p className="eyebrow">News &amp; Media</p>
            <h2>From the club, for the community.</h2>
          </div>
          <Link className="section-heading__link" href="/news">View all news <ChevronRight size={16} /></Link>
        </div>
        <div className="content-grid">
          {newsItems.map((item, index) => (
            <article className={`home-news-card home-news-card--${index + 1}`} key={item.title}>
              <Newspaper size={19} aria-hidden="true" />
              <p>{item.category}</p>
              <h3>{item.title}</h3>
              <span>{item.copy}</span>
              <Link href={item.href}>Read more <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--surface home-community">
        <div className="home-community__layout">
          <div>
            <p className="eyebrow">Community &amp; CSR</p>
            <h2>The love of football can move further than the final whistle.</h2>
            <p>
              SESC&apos;s community spaces are built to support positive chapter activity, participation and initiatives
              that put people first. Approved programmes and opportunities will be shared here.
            </p>
            <Link className="button button--ghost" href="/community">Community &amp; CSR <HandHeart size={16} /></Link>
          </div>
          <div className="home-community__mark" aria-hidden="true">
            <span>SESC</span>
            <small>ONE NATION · ONE VOICE</small>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="home-partners-title"
        className="section section--tight home-technology-partner"
      >
        <div className="home-technology-partner__content">
          <p className="eyebrow">Official technology partner</p>
          <h2 id="home-partners-title">A stronger digital home for supporters.</h2>
          <p>
            The SESC platform is designed and developed in partnership with{" "}
            <TopsborgWebsiteLink>
              {siteConfig.partners.topsborg.name}
            </TopsborgWebsiteLink>
            , supporting a responsible foundation for long-term digital growth.
          </p>
        </div>
      </section>

      <section className="section home-newsletter">
        <div className="newsletter-panel">
          <div>
            <p className="eyebrow">Stay in the formation</p>
            <h2>Get authorised club updates.</h2>
            <p>Newsletter delivery will be enabled once the club&apos;s approved mailing configuration is connected.</p>
          </div>
          <div aria-label="Newsletter availability" className="newsletter-form">
            <p className="newsletter-form__notice">
              Email enrolment is not enabled in this preview. Official mailing updates will appear here after approved
              delivery, consent, and unsubscribe controls are connected.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
