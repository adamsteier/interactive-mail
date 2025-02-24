'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface DesignGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DesignGuideModal = ({ isOpen, onClose }: DesignGuideModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-charcoal rounded-lg border-2 border-electric-teal p-6 max-w-4xl w-full shadow-glow"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-2xl font-medium text-electric-teal mb-6">Design Size Guide</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6 text-electric-teal/80">
              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-3">4X6 Postcard:</h4>
                <ul className="space-y-2">
                  <li>• 4X6 (152.4mm x 101.6mm + 3mm Bleed Margins)</li>
                  <li>• Image resolution (@300dpi) = 1871 x 1271 pixels</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Trim Marks</h4>
                <p>When printing we print on larger paper and then cut it down to size. We use these guide lines to aim where to cut.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Bleed Margins</h4>
                <p>This area is cut off. Make sure background Colour overflows into this margin for an edge to edge design.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Safe Zone</h4>
                <p>Keep important text and logos inside the safe zone. This is because printers can sometimes print with a minor skew.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Clear Zone</h4>
                <p>We need to make sure addresses and barcodes can be machine readable by keeping these areas clear.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-4">Download Templates</h4>
                <div className="grid gap-4">
                  <a 
                    href="/images/front.JPG" 
                    download
                    className="flex items-center justify-center rounded-lg border-2 border-electric-teal px-6 py-3 
                      text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200 gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Front Template
                  </a>
                  <a 
                    href="/images/back.JPG" 
                    download
                    className="flex items-center justify-center rounded-lg border-2 border-electric-teal px-6 py-3 
                      text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200 gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Back Template
                  </a>
                </div>
              </div>

              <div className="border-2 border-electric-teal/30 rounded-lg p-4">
                <Image 
                  src="/images/front.JPG"
                  alt="Postcard Template Guide"
                  width={600}
                  height={400}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-electric-teal hover:text-electric-teal/80"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default DesignGuideModal; 