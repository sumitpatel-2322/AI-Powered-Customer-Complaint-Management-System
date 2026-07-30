import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { commitComplaint } from '../store/complaintSlice';

// Helper component for Inputs with Blink Animation & Conditional Hiding
const Field = ({ label, value, isMissing = false, isMandatory = false, hasExtractionRun, type = "text", icon = null, bg = "#f8fafc", textColor = "#0f172a" }) => {
    const prevValueRef = useRef(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (value !== undefined && prevValueRef.current !== value && value !== '') {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 1500);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    // Goal 3: Hide element if empty, not mandatory, and extraction has run
    if (hasExtractionRun && !value && !isMandatory && !isMissing) {
        return null;
    }

    // Goal 5: New placeholder for mandatory sections if empty after extraction
    const placeholderText = (hasExtractionRun && !value) ? "Not provided" : "Awaiting AI extraction...";
    
    // Goal 4: Feedback effect on change
    const currentBg = isAnimating ? '#dcfce3' : bg;
    const currentBorder = isAnimating ? '#22c55e' : (isMissing ? '#ef5350' : '#cbd5e1');

    return (
        <div style={{ marginBottom: '20px', width: '100%' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', marginBottom: '8px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Goal 1: readOnly={true} */}
                <input 
                    type={type}
                    value={value || ''}
                    readOnly={true}
                    placeholder={placeholderText}
                    style={{ 
                        width: '100%', 
                        padding: '14px 16px', 
                        paddingRight: icon ? '40px' : '16px',
                        borderRadius: '8px', 
                        border: `1px solid ${currentBorder}`,
                        backgroundColor: currentBg,
                        color: textColor,
                        fontSize: '15px', // Goal 2: Larger Fonts
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: value ? '500' : '400',
                        boxSizing: 'border-box',
                        outline: 'none',
                        boxShadow: isAnimating ? '0 0 0 3px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.4s ease-out',
                    }}
                />
                {icon && (
                    <span style={{ position: 'absolute', right: '16px', color: '#94a3b8', fontSize: '16px' }}>
                        {icon}
                    </span>
                )}
            </div>
        </div>
    );
};

// Helper component for TextAreas with Blink Animation & Conditional Hiding
const TextAreaField = ({ label, value, isMissing = false, isMandatory = false, hasExtractionRun, rows = 4, bg = "#f8fafc", textColor = "#0f172a" }) => {
    const prevValueRef = useRef(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (value !== undefined && prevValueRef.current !== value && value !== '') {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 1500);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    if (hasExtractionRun && !value && !isMandatory && !isMissing) {
        return null;
    }

    const placeholderText = (hasExtractionRun && !value) ? "Not provided" : "Awaiting AI extraction...";
    const currentBg = isAnimating ? '#dcfce3' : bg;
    const currentBorder = isAnimating ? '#22c55e' : (isMissing ? '#ef5350' : '#cbd5e1');

    return (
        <div style={{ marginBottom: '20px', width: '100%' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', marginBottom: '8px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </label>
            <textarea 
                value={value || ''}
                readOnly={true}
                rows={rows}
                placeholder={placeholderText}
                style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    borderRadius: '8px', 
                    border: `1px solid ${currentBorder}`, 
                    backgroundColor: currentBg, 
                    color: textColor,
                    resize: 'vertical', 
                    fontSize: '15px', 
                    fontFamily: '"Inter", sans-serif', 
                    fontWeight: value ? '500' : '400',
                    lineHeight: '1.5',
                    boxSizing: 'border-box', 
                    outline: 'none', 
                    boxShadow: isAnimating ? '0 0 0 3px rgba(34, 197, 94, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.4s ease-out',
                }} 
            />
        </div>
    );
};

const ComplaintForm = () => {
    const dispatch = useDispatch();
    const { activeComplaint, status: requestStatus } = useSelector((state) => state.complaint);

    const { 
        ai_analysis = {}, 
        validation_errors = [], 
        status: complaintStatus,
        is_complete = false,
    } = activeComplaint || {};

    const isCommitted = complaintStatus === 'Committed';
    const displayStatus = complaintStatus || 'Pending Triage';
    const hasExtractionRun = activeComplaint !== null;

    const isCommitting = requestStatus === 'loading';
    const canCommit = is_complete && complaintStatus === 'Ready to Commit' && !isCommitted;

    const handleCommit = () => {
        if (canCommit && !isCommitting) dispatch(commitComplaint());
    };

    let badgeColor = '#d97706'; let badgeBg = '#fef3c7'; let badgeBorder = '#fde68a';
    if (displayStatus === 'Ready to Commit') { 
        badgeColor = '#059669'; badgeBg = '#d1fae5'; badgeBorder = '#a7f3d0';
    } else if (isCommitted) { 
        badgeColor = '#4f46e5'; badgeBg = '#e0e7ff'; badgeBorder = '#c7d2fe';
    }

    const isMissing = (key) => validation_errors.includes(`${key}`) || ai_analysis?.missing_fields?.includes(key);

    // Helpers to determine if entire sections should be hidden
    const shouldShow = (val, isMand) => Boolean(!hasExtractionRun || val || isMand);
    
    const showSection1 = shouldShow(activeComplaint?.source, false) || shouldShow(activeComplaint?.customer_name, false) || shouldShow(activeComplaint?.customer_contact, false) || shouldShow(activeComplaint?.location, false);
    const showSection2 = shouldShow(activeComplaint?.product_name, true) || shouldShow(activeComplaint?.strength, false) || shouldShow(activeComplaint?.batch_number, true) || shouldShow(activeComplaint?.manufacturing_date, false) || shouldShow(activeComplaint?.expiry_date, true) || shouldShow(activeComplaint?.affected_quantity, false) || shouldShow(activeComplaint?.manufacturer, false) || shouldShow(activeComplaint?.dosage_form, false);
    const showSection3 = shouldShow(activeComplaint?.complaint_category, true) || shouldShow(activeComplaint?.event_date, false) || shouldShow(activeComplaint?.originating_site_block, false) || shouldShow(activeComplaint?.impacted_non_product_material, false) || shouldShow(activeComplaint?.description, true);

    return (
        <div style={{ padding: '36px 40px', overflowY: 'auto', height: '100%', backgroundColor: '#ffffff', fontFamily: '"Inter", sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Log Customer Complaint</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>API & FDF Quality Assurance Module</p>
                </div>
                <span style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: '700',
                    backgroundColor: badgeBg, 
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`
                }}>
                    {displayStatus}
                </span>
            </div>

            {/* Validation Alerts */}
            {(validation_errors?.length > 0 || ai_analysis?.missing_fields?.length > 0) && (
                <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '20px', borderRadius: '10px', marginBottom: '32px', fontSize: '15px', border: '1px solid #fca5a5' }}>
                    <strong style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>Requires Information:</strong>
                    <ul style={{ margin: '0', paddingLeft: '24px', lineHeight: '1.6' }}>
                        {validation_errors?.map((err, i) => <li key={`val-${i}`}>{err}</li>)}
                        {ai_analysis?.missing_fields?.map((field, i) => <li key={`miss-${i}`}>Missing: {field}</li>)}
                    </ul>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginBottom: '40px' }}>
                
                {/* 1. ORIGIN & CUSTOMER DETAILS */}
                {showSection1 && (
                    <div>
                        <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '800', marginBottom: '24px' }}>1. Origin & Customer Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                            <Field label="Complaint Source" value={activeComplaint?.source} hasExtractionRun={hasExtractionRun} />
                            <Field label="Customer Name" value={activeComplaint?.customer_name} hasExtractionRun={hasExtractionRun} />
                            <Field label="Customer Contact" value={activeComplaint?.customer_contact} hasExtractionRun={hasExtractionRun} />
                            <Field label="Location" value={activeComplaint?.location} hasExtractionRun={hasExtractionRun} />
                        </div>
                    </div>
                )}

                {/* 2. PRODUCT & BATCH IDENTIFICATION */}
                {showSection2 && (
                    <div>
                        <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '800', marginBottom: '24px' }}>2. Product & Batch Identification</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                            <Field label="Product Name" value={activeComplaint?.product_name} isMissing={isMissing("Product Name is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} />
                            <Field label="Product Strength/Grade" value={activeComplaint?.strength} hasExtractionRun={hasExtractionRun} />
                            <Field label="Batch/Lot Number" value={activeComplaint?.batch_number} isMissing={isMissing("Batch Number is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} />
                            <Field label="Manufacturing Date" value={activeComplaint?.manufacturing_date} hasExtractionRun={hasExtractionRun} icon="📅" />
                            <Field label="Expiry Date" value={activeComplaint?.expiry_date} isMissing={isMissing("Expiry Date is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} icon="📅" />
                            {/* Goal 6: AI will dictate the quantity string without forcing 'kg' */}
                            <Field label="Quantity Affected" value={activeComplaint?.affected_quantity} hasExtractionRun={hasExtractionRun} />
                            <Field label="Manufacturer" value={activeComplaint?.manufacturer} hasExtractionRun={hasExtractionRun} />
                            <Field label="Dosage Form" value={activeComplaint?.dosage_form} hasExtractionRun={hasExtractionRun} />
                        </div>
                    </div>
                )}

                {/* 3. COMPLAINT DETAILS */}
                {showSection3 && (
                    <div>
                        <h3 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '800', marginBottom: '24px' }}>3. Complaint Details & Facility Impact</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                            <Field label="Complaint Type/Category" value={activeComplaint?.complaint_category} isMissing={isMissing("Complaint Category is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} />
                            <Field label="Event Date" value={activeComplaint?.event_date} hasExtractionRun={hasExtractionRun} icon="📅" />
                            <Field label="Originating Site Block" value={activeComplaint?.originating_site_block} hasExtractionRun={hasExtractionRun} />
                            <Field label="Impacted Non-Product Material" value={activeComplaint?.impacted_non_product_material} hasExtractionRun={hasExtractionRun} />
                        </div>
                        <TextAreaField label="Detailed Complaint Description" value={activeComplaint?.description} isMissing={isMissing("Complaint Description is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} rows={5} />
                    </div>
                )}

                {/* 4. INITIAL ASSESSMENT & PRIORITY (AI Section) */}
                <div style={{ 
                    backgroundColor: '#f8fafc',
                    backgroundImage: 'linear-gradient(to bottom right, #f4f8ff, #ebf4ff)',
                    border: '1px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '32px',
                    marginTop: '8px',
                    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.08), 0 4px 6px -2px rgba(59, 130, 246, 0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', borderBottom: '2px solid #bfdbfe', paddingBottom: '16px' }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ color: '#2563eb' }}>
                            <path d="M19.0011 5.43851L20.8122 6.64585L19.0011 7.85319L17.7938 9.66432L16.5864 7.85319L14.7753 6.64585L16.5864 5.43851L17.7938 3.62738L19.0011 5.43851ZM8.5 2L10.9701 7.02985L16 9.5L10.9701 11.9701L8.5 17L6.02985 11.9701L1 9.5L6.02985 7.02985L8.5 2ZM8.5 5.868L7.14083 8.63217L4.37666 9.99133L7.14083 11.3505L8.5 14.1147L9.85917 11.3505L12.6233 9.99133L9.85917 8.63217L8.5 5.868ZM19.0011 14.3357L20.8122 15.543L19.0011 16.7503L17.7938 18.5615L16.5864 16.7503L14.7753 15.543L16.5864 14.3357L17.7938 12.5245L19.0011 14.3357Z"></path>
                        </svg>
                        <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '800' }}>
                            AI Risk Assessment & Priority
                        </h3>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                        <Field label="Initial Severity" value={ai_analysis?.severity?.toUpperCase()} isMissing={isMissing("Severity assessment is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} bg="#ffffff" textColor="#1e3a8a" icon="▼" />
                        <Field label="Priority" value={ai_analysis?.priority?.toUpperCase()} isMissing={isMissing("Priority assessment is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} bg="#ffffff" textColor="#1e3a8a" icon="▼" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <TextAreaField label="AI Summary" value={ai_analysis?.summary} isMissing={isMissing("Summary is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} bg="#ffffff" textColor="#334155" rows={3} />
                        <TextAreaField label="Detailed Risk Assessment" value={ai_analysis?.risk_assessment} isMissing={isMissing("Risk Assessment is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} bg="#ffffff" textColor="#334155" rows={5} />
                        <Field label="Recommended Next Action" value={ai_analysis?.recommended_action} isMissing={isMissing("Recommended Action is required.")} isMandatory={true} hasExtractionRun={hasExtractionRun} bg="#ffffff" textColor="#1d4ed8" />
                    </div>
                </div>
            </div>

            {/* Commit Action / Read-Only State Disclaimer */}
            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '24px', textAlign: 'center' }}>
                {isCommitted ? (
                    <div style={{ color: '#4f46e5', fontSize: '14px', fontWeight: '700' }}>
                        ✅ This complaint has been committed to the QMS Ledger.
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handleCommit}
                            disabled={!canCommit || isCommitting}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '10px',
                                border: 'none',
                                fontSize: '15px',
                                fontWeight: '700',
                                letterSpacing: '0.3px',
                                color: '#ffffff',
                                backgroundColor: (!canCommit || isCommitting) ? '#cbd5e1' : '#4f46e5',
                                cursor: (!canCommit || isCommitting) ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                        >
                            {isCommitting ? 'Committing...' : 'Commit to QMS Ledger'}
                        </button>
                        <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                            {canCommit
                                ? 'Form is locked for manual editing. Use the chat to make further corrections before committing.'
                                : 'Form is locked for manual editing. Resolve the items above (via chat) before this complaint can be committed.'}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ComplaintForm;