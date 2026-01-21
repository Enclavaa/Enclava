import React from "react";
import { Github, MessageCircle } from "lucide-react";

export const CTASection: React.FC = () => {
  return (
    <section className="bg-black text-white py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto text-center">
        {/* Main CTA Block */}
        <div className="border-4 border-red-500 p-12 mb-16 bg-red-500 text-black">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-8">
            Be part of the data
            <br />
            ownership revolution.
          </h2>
          <button className="bg-black text-white font-black text-xl px-12 py-6 uppercase tracking-wider hover:bg-white hover:text-black transition-colors duration-200 border-4 border-black">
            Join Waitlist
          </button>
        </div>

        {/* Social Links */}
        <div className="flex justify-center items-center space-x-12">
          <a
            href="#"
            className="flex flex-col items-center group"
            aria-label="Twitter/X"
          >
            <div className="w-16 h-16 border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
              <span className="font-black text-2xl">𝕏</span>
            </div>
            <span className="font-mono mt-2 text-sm uppercase">Twitter</span>
          </a>

          <a
            href="#"
            className="flex flex-col items-center group"
            aria-label="GitHub"
          >
            <div className="w-16 h-16 border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
              <Github size={32} />
            </div>
            <span className="font-mono mt-2 text-sm uppercase">GitHub</span>
          </a>

          <a
            href="#"
            className="flex flex-col items-center group"
            aria-label="Telegram"
          >
            <div className="w-16 h-16 border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
              <MessageCircle size={32} />
            </div>
            <span className="font-mono mt-2 text-sm uppercase">Telegram</span>
          </a>
        </div>

        {/* Footer ASCII */}
        <div className="mt-16 font-mono text-xs text-red-500">
          <pre>
            {`═══════════════════════════════════════
          ENCLAVA © 2026
═══════════════════════════════════════`}
          </pre>
        </div>
      </div>
    </section>
  );
};
