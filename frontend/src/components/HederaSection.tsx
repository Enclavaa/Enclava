import React from "react";

export const HederaSection: React.FC = () => {
  return (
    <section className="bg-white text-black py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Left side - Content */}
          <div className="lg:w-2/3 lg:pr-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase mb-8">
              Built on
              <span className="text-red-500"> Sei</span>
            </h2>

            <div className="space-y-6">
              <div className="flex items-center font-mono text-lg">
                <span className="text-red-500 mr-4">[✓]</span>
                <span className="font-black">Sub-400ms finality</span>
              </div>
              <div className="flex items-center font-mono text-lg">
                <span className="text-red-500 mr-4">[✓]</span>
                <span className="font-black">Agent-ready infrastructure</span>
              </div>
              <div className="flex items-center font-mono text-lg">
                <span className="text-red-500 mr-4">[✓]</span>
                <span className="font-black">
                  High-performance marketplaces
                </span>
              </div>
            </div>

            <div className="mt-12 border-4 border-black p-6">
              <p className="text-xl font-black uppercase">
                Machine-speed data economy
              </p>
            </div>
          </div>

          {/* Right side - Geometric visual */}
          <div className="lg:w-1/3 mt-12 lg:mt-0">
            <div className="relative">
              <img src="/images/sei.png" />
            </div>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center border-2 border-black p-8">
            <div className="font-mono text-4xl font-black text-red-500 mb-2">
              &lt;400ms
            </div>
            <div className="font-black uppercase text-lg">
              Transaction Finality
            </div>
          </div>
          <div className="text-center border-2 border-black p-8">
            <div className="font-mono text-4xl font-black text-red-500 mb-2">
              22K+
            </div>
            <div className="font-black uppercase text-lg">TPS Capacity</div>
          </div>
          <div className="text-center border-2 border-black p-8">
            <div className="font-mono text-4xl font-black text-red-500 mb-2">
              100%
            </div>
            <div className="font-black uppercase text-lg">Data Ownership</div>
          </div>
        </div>
      </div>
    </section>
  );
};
