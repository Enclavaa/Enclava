import React from 'react';

export const WhySection: React.FC = () => {
  const features = [
    "Your data, your rules",
    "Onchain proof of ownership", 
    "Privacy-first sharing",
    "Earn when your data is used"
  ];

  return (
    <section className="bg-white text-black py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-black uppercase mb-16">
          Why Enclava?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="border-4 border-black p-8">
              <div className="flex items-start">
                <span className="font-mono text-red-500 text-2xl mr-4">
                  [{(index + 1).toString().padStart(2, '0')}]
                </span>
                <p className="text-2xl md:text-3xl font-black uppercase leading-tight">
                  {feature}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Geometric divider */}
        <div className="mt-16 flex items-center justify-center">
          <div className="w-4 h-4 bg-black transform rotate-45 mx-2"></div>
          <div className="w-8 h-8 bg-red-500 transform rotate-45 mx-2"></div>
          <div className="w-4 h-4 bg-black transform rotate-45 mx-2"></div>
        </div>
      </div>
    </section>
  );
};