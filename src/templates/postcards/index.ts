import PlayfulPostcard from './PlayfulPostcard';
import ProfessionalPostcard from './ProfessionalPostcard';
import ModernPostcard from './ModernPostcard';
import TraditionalPostcard from './TraditionalPostcard';

export {
  PlayfulPostcard,
  ProfessionalPostcard,
  ModernPostcard,
  TraditionalPostcard
};

// Type for all postcard templates
export type PostcardTemplate = 
  | typeof PlayfulPostcard
  | typeof ProfessionalPostcard 
  | typeof ModernPostcard
  | typeof TraditionalPostcard;

// Helper for mapping brand identity to the right template
export const getTemplateByStyle = (style: string): PostcardTemplate => {
  switch (style.toLowerCase()) {
    case 'playful':
      return PlayfulPostcard;
    case 'professional':
      return ProfessionalPostcard;
    case 'modern':
      return ModernPostcard;
    case 'traditional':
      return TraditionalPostcard;
    default:
      return ProfessionalPostcard; // Default fallback
  }
}; 