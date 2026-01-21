import React from "react";

export const HeroSection: React.FC = () => {
  return (
    <section className="min-h-screen bg-black text-white flex flex-col justify-center px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto w-full">
        {/* ASCII Art Header */}
        <div className="font-mono text-xs md:text-sm text-red-500 mb-8">
          <pre className="whitespace-pre-wrap">
            {`███████╗███╗   ██╗ ██████╗██╗      █████╗ ██╗   ██╗ █████╗ 
██╔════╝████╗  ██║██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗
█████╗  ██╔██╗ ██║██║     ██║     ███████║██║   ██║███████║
██╔══╝  ██║╚██╗██║██║     ██║     ██╔══██║╚██╗ ██╔╝██╔══██║
███████╗██║ ╚████║╚██████╗███████╗██║  ██║ ╚████╔╝ ██║  ██║
╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝`}
          </pre>
        </div>

        {/* Main Headlines */}
        <h1 className="text-4xl md:text-7xl lg:text-8xl font-black uppercase leading-none mb-6">
          Own Your Data.
          <br />
          <span className="text-red-500">Share It Safely.</span>
        </h1>

        <div className="border-l-4 border-red-500 pl-6 mb-12 max-w-2xl">
          <p className="text-lg md:text-2xl font-mono uppercase tracking-wide">
            A decentralized data marketplace powered by Hedera.
          </p>
        </div>

        {/* CTA Button */}
        {/* <div>
          <button className="bg-red-500 text-black font-black text-xl md:text-2xl px-12 py-6 uppercase tracking-wider hover:bg-white transition-colors duration-200 border-4 border-red-500">
            Join the Waitlist
          </button>
        </div> */}

        {/* Bottom geometric element */}
        {/* <div className="mt-16">
          <div className="w-32 h-32 bg-red-500"></div>
        </div> */}
      </div>
    </section>
  );
};
