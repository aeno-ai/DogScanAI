import { useState, useEffect } from "react";
import TopNav from "../components/ui/TopNav";
import Sidebar from "../components/ui/Sidebar";

// ============================================================
// MOCK DATA — replace with real fetch from your PostgreSQL DB
// 🔌 DB HOOK: GET /api/community/scans
// ============================================================
const MOCK_SCANS = [
  {
    id: 1,
    user: { id: 101, name: "Sofia R.", avatar: "SR" },
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
    breed: "Golden Retriever",
    confidence: 97,
    likes: 84,
    liked: false,
    comments: [
      { id: 1, author: { name: "James P.", avatar: "JP" }, text: "Such a good boy! 🐾", createdAt: "2h ago" },
      { id: 2, author: { name: "Aiko T.", avatar: "AT" }, text: "The confidence score is super high!", createdAt: "1h ago" },
    ],
    shares: 12,
    createdAt: "3h ago",
  },
  {
    id: 2,
    user: { id: 102, name: "Marco L.", avatar: "ML" },
    image: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=600&q=80",
    breed: "Mixed Breed",
    mix: ["Husky 48%", "Malamute 31%", "Samoyed 21%"],
    confidence: 71,
    likes: 52,
    liked: true,
    comments: [],
    shares: 5,
    createdAt: "6h ago",
  },
  {
    id: 3,
    user: { id: 103, name: "Priya N.", avatar: "PN" },
    image: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=80",
    breed: "Beagle",
    confidence: 93,
    likes: 120,
    liked: false,
    comments: [
      { id: 3, author: { name: "Sofia R.", avatar: "SR" }, text: "Beagles are the best 😍", createdAt: "5h ago" },
    ],
    shares: 20,
    createdAt: "1d ago",
  },
  {
    id: 4,
    user: { id: 104, name: "Leon K.", avatar: "LK" },
    image: "https://images.unsplash.com/photo-1534361960057-19f4434a8d3e?w=600&q=80",
    breed: "Dalmatian",
    confidence: 88,
    likes: 67,
    liked: false,
    comments: [],
    shares: 9,
    createdAt: "2d ago",
  },
  {
    id: 5,
    user: { id: 105, name: "Yuna C.", avatar: "YC" },
    image: "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=600&q=80",
    breed: "Mixed Breed",
    mix: ["Shih Tzu 55%", "Poodle 45%"],
    confidence: 66,
    likes: 38,
    liked: false,
    comments: [
      { id: 4, author: { name: "Marco L.", avatar: "ML" }, text: "Looks just like my dog!", createdAt: "1d ago" },
    ],
    shares: 3,
    createdAt: "2d ago",
  },
  {
    id: 6,
    user: { id: 106, name: "Theo B.", avatar: "TB" },
    image: "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&q=80",
    breed: "Labrador Retriever",
    confidence: 95,
    likes: 201,
    liked: true,
    comments: [
      { id: 5, author: { name: "Priya N.", avatar: "PN" }, text: "Classic lab energy 🐶", createdAt: "20h ago" },
      { id: 6, author: { name: "Leon K.", avatar: "LK" }, text: "97% would've been my guess too!", createdAt: "18h ago" },
    ],
    shares: 44,
    createdAt: "3d ago",
  },
];

// ============================================================
// HELPERS
// ============================================================
const AVATAR_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];
const colorFor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

function Avatar({ initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${colorFor(initials)}, ${colorFor(initials)}bb)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.34,
      flexShrink: 0, userSelect: "none",
    }}>
      {initials}
    </div>
  );
}

// ============================================================
// ICONS
// ============================================================
const HeartIcon = ({ filled }) => (
  <svg width="17" height="17" viewBox="0 0 24 24"
    fill={filled ? "#ef4444" : "none"}
    stroke={filled ? "#ef4444" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const CommentIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PawIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <ellipse cx="6" cy="7" rx="2.5" ry="3.5"/>
    <ellipse cx="12" cy="5" rx="2.5" ry="3.5"/>
    <ellipse cx="18" cy="7" rx="2.5" ry="3.5"/>
    <ellipse cx="3.5" cy="13" rx="2" ry="2.5"/>
    <path d="M12 10c-4 0-7.5 2.5-7.5 6 0 2.5 1.5 4 3.5 4 1 0 2-.5 4-.5s3 .5 4 .5c2 0 3.5-1.5 3.5-4 0-3.5-3.5-6-7.5-6z"/>
  </svg>
);

// ============================================================
// CONFIDENCE BADGE
// ============================================================
function ConfidenceBadge({ value, isMixed }) {
  const color = isMixed ? "#f59e0b" : value >= 90 ? "#10b981" : value >= 75 ? "#6366f1" : "#f59e0b";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 700, color,
    }}>
      <PawIcon /> {isMixed ? "Mixed Breed" : `${value}% ${value >= 90 ? "confident" : "match"}`}
    </div>
  );
}

// ============================================================
// COMMENT SECTION
// ============================================================
function CommentSection({ postId, comments, onAdd }) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    // 🔌 DB HOOK: POST /api/community/scans/:id/comments { text }
    onAdd(postId, text.trim());
    setText("");
  };

  return (
    <div style={{ padding: "0 14px 14px" }}>
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, marginTop: 4 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Avatar initials={c.author.avatar} size={28} />
              <div style={{
                background: "#f8fafc", borderRadius: 10, padding: "7px 11px",
                flex: 1, fontSize: 12.5, lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 700, color: "#1e293b", marginRight: 5 }}>{c.author.name}</span>
                <span style={{ color: "#475569" }}>{c.text}</span>
                <div style={{ color: "#94a3b8", fontSize: 10.5, marginTop: 2 }}>{c.createdAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Avatar initials="ME" size={28} />
        <div style={{
          display: "flex", flex: 1, alignItems: "center",
          background: "#f1f5f9", borderRadius: 20, padding: "5px 5px 5px 12px",
          border: "1px solid #e2e8f0",
        }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment..."
            style={{
              flex: 1, border: "none", background: "transparent",
              fontSize: 12.5, color: "#334155", outline: "none",
            }}
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? "#6366f1" : "#e2e8f0",
              border: "none", borderRadius: "50%", width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: text.trim() ? "pointer" : "default",
              color: text.trim() ? "#fff" : "#94a3b8",
              transition: "all 0.2s", flexShrink: 0,
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCAN CARD
// ============================================================
function ScanCard({ scan, onLike, onAddComment, onShare }) {
  const [showComments, setShowComments] = useState(false);
  const [toast, setToast] = useState(false);
  const isMixed = scan.breed === "Mixed Breed";

  const handleShare = () => {
    // 🔌 DB HOOK: POST /api/community/scans/:id/share
    onShare(scan.id);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 18, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.04)",
      border: "1px solid #f1f5f9", position: "relative",
    }}>
      {toast && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          background: "#1e293b", color: "#fff", borderRadius: 8,
          padding: "5px 13px", fontSize: 12, fontWeight: 600,
          animation: "fadeIn 0.2s ease",
        }}>
          Link copied!
        </div>
      )}

      {/* User header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "13px 14px 10px",
      }}>
        <Avatar initials={scan.user.avatar} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1e293b" }}>{scan.user.name}</div>
          <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{scan.createdAt}</div>
        </div>
        <ConfidenceBadge value={scan.confidence} isMixed={isMixed} />
      </div>

      {/* Scan image */}
      <div style={{ position: "relative" }}>
        <img
          src={scan.image}
          alt={scan.breed}
          style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
        />
        {/* Breed label overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%)",
          padding: "32px 14px 12px",
        }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: -0.3 }}>
            {scan.breed}
          </div>
          {isMixed && scan.mix && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
              {scan.mix.map((m) => (
                <span key={m} style={{
                  background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)",
                  color: "#fff", borderRadius: 12, padding: "2px 9px",
                  fontSize: 11.5, fontWeight: 600, border: "1px solid rgba(255,255,255,0.25)",
                }}>
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px", fontSize: 12.5, color: "#94a3b8",
        borderBottom: "1px solid #f8fafc",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>❤️</span> {scan.likes}
        </span>
        <span style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowComments(!showComments)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12.5 }}
          >
            {scan.comments.length} comment{scan.comments.length !== 1 ? "s" : ""}
          </button>
          <span>{scan.shares} shares</span>
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", padding: "2px 6px", borderBottom: showComments ? "1px solid #f1f5f9" : "none" }}>
        {[
          {
            icon: <HeartIcon filled={scan.liked} />,
            label: "Like",
            active: scan.liked,
            color: "#ef4444",
            // 🔌 DB HOOK: PATCH /api/community/scans/:id/like
            onClick: () => onLike(scan.id),
          },
          {
            icon: <CommentIcon />,
            label: "Comment",
            active: showComments,
            color: "#6366f1",
            onClick: () => setShowComments(!showComments),
          },
          {
            icon: <ShareIcon />,
            label: "Share",
            active: false,
            color: "#10b981",
            onClick: handleShare,
          },
        ].map(({ icon, label, active, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "9px 0", border: "none", background: "none",
              cursor: "pointer", borderRadius: 10,
              color: active ? color : "#64748b",
              fontWeight: active ? 700 : 500,
              fontSize: 13, transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {showComments && (
        <CommentSection
          postId={scan.id}
          comments={scan.comments}
          onAdd={onAddComment}
        />
      )}
    </div>
  );
}

// ============================================================
// SKELETON CARD
// ============================================================
function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, overflow: "hidden",
      border: "1px solid #f1f5f9",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px 10px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9" }} />
        <div>
          <div style={{ width: 100, height: 11, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: 60, height: 9, background: "#f8fafc", borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ width: "100%", height: 280, background: "#f1f5f9" }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ width: "60%", height: 12, background: "#f1f5f9", borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function Community() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔌 DB HOOK: Replace with real API call
  // fetch("/api/community/scans")
  //   .then(res => res.json())
  //   .then(data => { setScans(data); setLoading(false); });
  useEffect(() => {
    const timer = setTimeout(() => {
      setScans(MOCK_SCANS);
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  // 🔌 DB HOOK: PATCH /api/community/scans/:id/like
  const handleLike = (id) => {
    setScans((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, liked: !s.liked, likes: s.liked ? s.likes - 1 : s.likes + 1 } : s
      )
    );
  };

  // 🔌 DB HOOK: POST /api/community/scans/:id/comments
  const handleAddComment = (id, text) => {
    setScans((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, comments: [...s.comments, { id: Date.now(), author: { name: "Me", avatar: "ME" }, text, createdAt: "just now" }] }
          : s
      )
    );
  };

  // 🔌 DB HOOK: POST /api/community/scans/:id/share
  const handleShare = (id) => {
    setScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, shares: s.shares + 1 } : s))
    );
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <TopNav />

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar />

        {/* Main content */}
        <main style={{ flex: 1, padding: "28px 24px 60px", overflowY: "auto" }}>
          {/* Page header */}
          <div style={{ maxWidth: 560, margin: "0 auto 24px" }}>
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: "#1e293b",
              margin: 0, letterSpacing: -0.5,
            }}>
              🐾 Community Scans
            </h1>
            <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
              See what breeds the community has discovered
            </p>
          </div>

          {/* Feed */}
          <div style={{
            maxWidth: 560, margin: "0 auto",
            display: "flex", flexDirection: "column", gap: 18,
          }}>
            {loading
              ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
              : scans.map((scan) => (
                  <ScanCard
                    key={scan.id}
                    scan={scan}
                    onLike={handleLike}
                    onAddComment={handleAddComment}
                    onShare={handleShare}
                  />
                ))}
          </div>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}