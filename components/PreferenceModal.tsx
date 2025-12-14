
import React from 'react';

// Manual preference settings have been replaced by automated XRAI logic.
// This component is kept as a placeholder to prevent import errors but renders nothing.

interface PreferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PreferenceModal: React.FC<PreferenceModalProps> = () => {
    return null;
};

export default PreferenceModal;