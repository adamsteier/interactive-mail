/**
 * Provides a fallback design code for when the Claude API is unavailable
 */
export const getFallbackDesignCode = (designStyle: string, brandName: string): string => {
  // Map designStyle to appropriate colors
  const colors = {
    professional: {
      bg: '#f8f9fa',
      primary: '#1a365d',
      secondary: '#2c5282',
      text: '#2d3748',
      accent1: '#4299e1',
      accent2: '#e2e8f0'
    },
    modern: {
      bg: '#2d3748',
      primary: '#38b2ac',
      secondary: '#234e52',
      text: '#e2e8f0',
      accent1: '#f687b3',
      accent2: '#553c9a'
    },
    elegant: {
      bg: '#f7f7f7',
      primary: '#7c3aed',
      secondary: '#4c1d95',
      text: '#1e293b',
      accent1: '#c4b5fd',
      accent2: '#8b5cf6'
    }
  };
  
  // Select the color palette based on style
  const palette = colors[designStyle as keyof typeof colors] || colors.professional;
  
  return `// PostcardDesign component with React.createElement syntax
const PostcardDesign = (props) => {
  // Extract props with defaults
  const { 
    imageUrl, 
    isSelected, 
    onSelect, 
    imagePosition, 
    onDragEnd,
    brandName = "${brandName}",
    tagline = "Your trusted partner",
    contactInfo = {},
    callToAction = "Contact us today",
    extraInfo = ""
  } = props;
  
  // Colors for ${designStyle} style
  const colors = {
    bg: "${palette.bg}",
    primary: "${palette.primary}",
    secondary: "${palette.secondary}",
    text: "${palette.text}",
    accent1: "${palette.accent1}",
    accent2: "${palette.accent2}"
  };
  
  // Style objects
  const containerStyle = {
    width: '1872px',
    height: '1271px',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
    background: 'linear-gradient(to bottom, #f5f8fa, #e5e8f5)'
  };
  
  const headerStyle = {
    color: colors.primary,
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  };
  
  const subheaderStyle = {
    color: colors.secondary,
    fontSize: '0.875rem',
    fontStyle: 'italic',
    marginBottom: '1rem'
  };
  
  const ctaStyle = {
    backgroundColor: colors.primary,
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: '1rem',
    marginTop: '1rem'
  };
  
  const imageContainerStyle = {
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };
  
  const contactStyle = {
    color: colors.text,
    fontSize: '0.75rem',
    marginTop: 'auto'
  };
  
  // Create benefits based on design style
  const benefits = [
    "${designStyle === 'professional' ? 'Trusted expertise' : designStyle === 'modern' ? 'Innovative solutions' : 'Premium quality'}",
    "${designStyle === 'professional' ? 'Proven results' : designStyle === 'modern' ? 'Time-saving technology' : 'Personalized service'}",
    "${designStyle === 'professional' ? 'Industry compliance' : designStyle === 'modern' ? '24/7 support' : 'Attention to detail'}"
  ];
  
  // Main container
  return React.createElement(
    'div',
    {
      className: \`border-2 \${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} rounded-lg\`,
      style: containerStyle,
      onClick: onSelect
    },
    [
      // Content container
      React.createElement('div', { className: 'p-4 flex flex-col h-full' }, [
        // Header with brand and tagline
        React.createElement('div', { className: 'mb-3' }, [
          React.createElement('h3', { style: headerStyle }, brandName),
          React.createElement('p', { style: subheaderStyle }, tagline)
        ]),
        
        // Main content - two columns
        React.createElement('div', { className: 'flex flex-1 gap-4 mb-3' }, [
          // Left column - text content
          React.createElement('div', { className: 'w-1/2' }, [
            // Benefits list
            React.createElement('ul', { className: 'text-sm space-y-2', style: { color: colors.text } }, 
              benefits.map((benefit, index) => 
                React.createElement('li', { key: index, className: 'flex items-start' }, [
                  React.createElement('span', { className: 'mr-1', style: { color: colors.primary } }, '•'),
                  benefit
                ])
              )
            ),
            
            // Call to action
            React.createElement('div', { style: ctaStyle }, callToAction)
          ]),
          
          // Right column - image area
          React.createElement('div', { className: 'w-1/2 bg-gray-200 relative overflow-hidden rounded', style: imageContainerStyle },
            imageUrl ? 
              React.createElement('div', {
                className: 'absolute inset-0 bg-cover bg-center',
                style: {
                  backgroundImage: \`url(\${imageUrl})\`,
                  transform: \`translate3d(\${imagePosition.x}px, \${imagePosition.y}px, 0) scale(\${imagePosition.scale})\`
                }
              }) : 
              React.createElement('div', { 
                className: 'absolute inset-0 flex items-center justify-center text-gray-400' 
              }, 'Image placeholder')
          )
        ]),
        
        // Contact info footer
        React.createElement('div', { style: contactStyle }, [
          contactInfo.phone && React.createElement('p', {}, \`📞 \${contactInfo.phone}\`),
          contactInfo.email && React.createElement('p', {}, \`✉️ \${contactInfo.email}\`),
          contactInfo.website && React.createElement('p', {}, \`🌐 \${contactInfo.website}\`),
          contactInfo.address && React.createElement('p', {}, \`📍 \${contactInfo.address}\`),
          extraInfo && React.createElement('p', { className: 'italic mt-2' }, extraInfo)
        ])
      ])
    ]
  );
};`;
}; 