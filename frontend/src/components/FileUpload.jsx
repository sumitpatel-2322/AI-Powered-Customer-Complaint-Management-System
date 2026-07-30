import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadFile } from '../store/complaintSlice';

const FileUpload = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const { status } = useSelector((state) => state.complaint);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        dispatch(uploadFile(file));
        e.target.value = null;
    };

    const handleButtonClick = () => {
        if (status !== 'loading') {
            fileInputRef.current?.click();
        }
    };

    return (
        <div style={{ width: '100%' }}>
            <input
                type="file"
                accept="application/pdf, image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            
            <div 
                onClick={handleButtonClick}
                style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.2s, background-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
                onMouseOver={(e) => { if(status !== 'loading') e.currentTarget.style.borderColor = '#3b82f6'; }}
                onMouseOut={(e) => { if(status !== 'loading') e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
                {status === 'loading' ? (
                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Processing Document...</span>
                ) : (
                    <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28" style={{ marginBottom: '4px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                            Drag & drop complaint document here
                        </span>
                        <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: '500' }}>
                            or click to browse
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUpload;