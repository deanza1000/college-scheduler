import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer
      className="mt-16 pt-12 pb-8 border-t border-border/40 text-textSecondary text-sm shrink-0 bg-background/30 backdrop-blur-md"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-10">
          {/* Right Column: Large Brand Header & Description */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.svg"
                alt="Professor Orca Logo"
                className="w-10 h-10 object-contain drop-shadow"
              />
              <h2 className="text-3xl font-extrabold tracking-tight font-serif text-textPrimary bg-gradient-to-l from-textPrimary via-textPrimary to-textSecondary bg-clip-text">
                Professor Orca
              </h2>
            </div>
            <p className="text-textSecondary/80 text-sm leading-relaxed max-w-lg">
              בניית מערכת שעות חכמה, פשוטה ופרטית לחלוטין. מודל אופטימיזציה
              אלגוריתמי בשילוב בינה מלאכותית המאפשר לסטודנטים למצוא את לוח
              הזמנים המושלם בלחיצת כפתור.
            </p>
          </div>

          {/* Left Column: Resources & Info */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <h3 className="font-bold text-textPrimary text-base mb-1 tracking-wide">
              משאבים ומידע
            </h3>
            <ul className="space-y-2.5 text-textSecondary/70 text-sm">
              <li>
                <a
                  href="https://github.com/deanza1000/college-scheduler"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-textPrimary transition-colors inline-block"
                >
                  <span>מאגר הקוד של פרופסר אורקה</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/oshriagronov/braude-mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-textPrimary transition-colors inline-block"
                >
                  <span>מאגר הקוד של Braude Mcp</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.braude.ac.il"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-textPrimary transition-colors inline-block"
                >
                  <span>מכללת אורט בראודה</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider Line */}
        <div className="border-t border-border/30 pt-6 flex items-center justify-between gap-4 text-xs text-textSecondary/60">
          <div>
            © {new Date().getFullYear()} Professor Orca. כל הזכויות שמורות.
          </div>
        </div>
      </div>
    </footer>
  );
};
