'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, Copy, Check, FileCheck, Layers } from 'lucide-react';
import { NamasteCodeRecord } from '@/lib/supabaseClient';

interface ApiResponse {
  success: boolean;
  count: number;
  data: NamasteCodeRecord[];
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NamasteCodeRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NamasteCodeRecord | null>(null);

  // Only user-provided inputs (everything else comes from backend)
  const [clinicalStatus, setClinicalStatus] = useState('active');
  const [patientId, setPatientId] = useState('');

  // Generated FHIR JSON (only after clicking Generate FHIR)
  const [generatedJson, setGeneratedJson] = useState<object | null>(null);
  const [copied, setCopied] = useState(false);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastHiding, setToastHiding] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- Search (unchanged backend interaction) ---
  const fetchSuggestions = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const json: ApiResponse = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSuggestions(json.data);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Search suggestions failed', err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 200);
  };

  const handleSelect = (item: NamasteCodeRecord) => {
    const displayName = item['Name English'] || item['TM2 Code'] || query;
    setQuery(displayName);
    setShowDropdown(false);
    setSelectedRecord(item);
    setGeneratedJson(null);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setShowDropdown(false);
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const json: ApiResponse = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        handleSelect(json.data[0]);
      }
    } catch (err) {
      console.error('Search query failed', err);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedRecord(null);
    setGeneratedJson(null);
  };

  // Invalidate generated JSON on any user input change
  const handleClinicalStatusChange = (value: string) => {
    setClinicalStatus(value);
    setGeneratedJson(null);
  };

  const handlePatientIdChange = (value: string) => {
    setPatientId(value);
    setGeneratedJson(null);
  };

  // Validation: need a selected record + patient ID filled
  const isFormValid = selectedRecord !== null && patientId.trim() !== '';

  // Generate FHIR Condition Resource — all terminology from backend data only
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedRecord) return;

    const patientRef = patientId.trim().startsWith('Patient/')
      ? patientId.trim()
      : `Patient/${patientId.trim()}`;

    // Build coding array strictly from backend data — no hardcoded values
    const codingArray: Array<{ system: string; code: string; display: string }> = [];

    if (selectedRecord['Ayurveda Code']) {
      codingArray.push({
        system: 'http://namaste.ayush.gov.in/codes',
        code: selectedRecord['Ayurveda Code'],
        display: selectedRecord['Name English'] || selectedRecord['Ayurveda Code'],
      });
    }

    if (selectedRecord['TM2 Code']) {
      codingArray.push({
        system: 'http://id.who.int/icd/release/11/mms',
        code: selectedRecord['TM2 Code'],
        display: selectedRecord['Name English'] || selectedRecord['TM2 Code'],
      });
    }

    const conditionText = selectedRecord['Name English'] || query;

    const fhirCondition = {
      resourceType: 'Condition',
      id: crypto.randomUUID(),
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: clinicalStatus,
          },
        ],
      },
      code: {
        coding: codingArray,
        text: conditionText,
      },
      subject: {
        reference: patientRef,
      },
      recordedDate: new Date().toISOString(),
    };

    setGeneratedJson(fhirCondition);

    // Show success toast
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastHiding(false);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setToastHiding(true);
      setTimeout(() => setShowToast(false), 220);
    }, 2500);
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    if (!generatedJson) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON', err);
    }
  };

  // Syntax highlighting for JSON (white background friendly)
  const formatJsonToHtml = (obj: unknown): string => {
    const jsonStr = JSON.stringify(obj, null, 2);
    if (!jsonStr) return '';

    const escaped = jsonStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main className="search-container" ref={containerRef}>

      {/* Toast notification — upper-right corner */}
      {showToast && (
        <div className="toast-wrapper">
          <div className={`toast-success${toastHiding ? ' toast-hiding' : ''}`}>
            <Check size={15} className="toast-check-icon" />
            <span>FHIR Generation Successful</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="header">
        <h1 className="title-logo">
          <span className="logo-brand">
            <span className="logo-s">S</span>
            <span className="logo-a">a</span>
            <span className="logo-n">n</span>
            <span className="logo-g">g</span>
            <span className="logo-a2">a</span>
            <span className="logo-m">m</span>
          </span>
          <span className="logo-colon">:</span>
          <span className="logo-text">The API for Ayurvedic Interoperability</span>
        </h1>
        <p className="subtitle">
          Connecting Ayurveda with the language of Modern Healthcare
        </p>
      </header>

      {/* Workspace: Left Controls + Right Output */}
      <div className="workspace-grid">
        {/* LEFT WORKSPACE: Search + Form Card */}
        <div className="left-workspace">
          {/* Pill Search Input with Autocomplete Dropdown */}
          <div className="search-box-wrapper">
            <form onSubmit={handleSearchSubmit}>
              {isSearching ? (
                <Loader2 size={19} className="spinner-icon" />
              ) : (
                <span className="search-icon-left">
                  <Search size={19} />
                </span>
              )}

              <input
                type="text"
                className="search-input-pill"
                placeholder="Search by English, Devanagari, Hinglish, TM2, or Ayurveda code..."
                value={query}
                onChange={handleInputChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                autoComplete="off"
                spellCheck="false"
              />

              {query && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={handleClear}
                  title="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </form>

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div className="dropdown-menu">
                {suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <div
                      key={item['Sr No.'] || idx}
                      className="dropdown-item"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="item-left">
                        <div className="item-english">
                          {item['Name English'] || 'Unnamed Term'}
                        </div>
                        {(item['Namc Term Devanagari'] || item['Hinglish']) && (
                          <div className="item-sub">
                            {item['Namc Term Devanagari'] && (
                              <span>{item['Namc Term Devanagari']}</span>
                            )}
                            {item['Namc Term Devanagari'] && item['Hinglish'] && (
                              <span>&bull;</span>
                            )}
                            {item['Hinglish'] && <span>{item['Hinglish']}</span>}
                          </div>
                        )}
                      </div>

                      <div className="item-badges">
                        {item['Ayurveda Code'] && (
                          <span className="badge-ayu">{item['Ayurveda Code']}</span>
                        )}
                        {item['TM2 Code'] && (
                          <span className="badge-tm2">{item['TM2 Code']}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  !isSearching && (
                    <div className="dropdown-empty">
                      No matching terms found
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Left Card: Create FHIR Condition */}
          <div className="card-box card-box-left">
            {selectedRecord ? (
              <>
                <div className="card-box-header">
                  <div className="card-header-title">
                    <FileCheck size={16} className="card-header-icon" />
                    <span>Create FHIR Condition</span>
                  </div>
                  <span className="badge-status-tag">FHIR R4</span>
                </div>

                <div className="card-box-body">
                  <form onSubmit={handleGenerate} className="condition-form">

                    {/* Read-only Selected Concept */}
                    <div className="selected-concept-section">
                      <div className="form-section-title">Selected Concept</div>
                      <div className="concept-display-name">
                        {selectedRecord['Name English'] || 'Unnamed Term'}
                      </div>
                      <div className="concept-mappings">
                        {selectedRecord['Ayurveda Code'] && (
                          <div className="mapping-row">
                            <span className="mapping-label">NAMASTE</span>
                            <span className="mapping-value">{selectedRecord['Ayurveda Code']}</span>
                          </div>
                        )}
                        {selectedRecord['TM2 Code'] && (
                          <div className="mapping-row">
                            <span className="mapping-label">TM2</span>
                            <span className="mapping-value">{selectedRecord['TM2 Code']}</span>
                          </div>
                        )}
                        {selectedRecord['Hinglish'] && (
                          <div className="mapping-row">
                            <span className="mapping-label">Hinglish</span>
                            <span className="mapping-value mapping-italic">{selectedRecord['Hinglish']}</span>
                          </div>
                        )}
                        {selectedRecord['Namc Term Devanagari'] && (
                          <div className="mapping-row">
                            <span className="mapping-label">Devanagari</span>
                            <span className="mapping-value">{selectedRecord['Namc Term Devanagari']}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clinical Status dropdown */}
                    <div className="form-section">
                      <div className="form-section-title">Clinical Status</div>
                      <div className="form-group">
                        <select
                          id="clinicalStatus"
                          className="form-select"
                          value={clinicalStatus}
                          onChange={(e) => handleClinicalStatusChange(e.target.value)}
                          required
                        >
                          <option value="active">Active</option>
                          <option value="recurrence">Recurrence</option>
                          <option value="relapse">Relapse</option>
                          <option value="inactive">Inactive</option>
                          <option value="remission">Remission</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                    {/* Patient / ABHA ID */}
                    <div className="form-section">
                      <div className="form-section-title">Patient / ABHA ID</div>
                      <div className="form-group">
                        <input
                          id="patientId"
                          type="text"
                          className="form-input"
                          value={patientId}
                          onChange={(e) => handlePatientIdChange(e.target.value)}
                          placeholder="e.g. ABHA-12-3456-7890"
                          required
                        />
                      </div>
                    </div>

                    {/* Generate FHIR button */}
                    <div className="form-action-wrapper">
                      <button
                        type="submit"
                        className="generate-fhir-btn"
                        disabled={!isFormValid}
                      >
                        Generate FHIR
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="card-box-body empty-blank-panel" />
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE: FHIR JSON Output */}
        <div className="right-workspace">
          <div className="card-box card-box-right">
            {generatedJson ? (
              <>
                <div className="card-box-header">
                  <div className="card-header-title">
                    <Layers size={16} className="card-header-icon ehr-icon" />
                    <span>FHIR Condition Resource</span>
                  </div>
                  <button
                    type="button"
                    className={`copy-json-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopyJson}
                  >
                    {copied ? (
                      <>
                        <Check size={12} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="card-box-body json-body">
                  <pre className="json-code-display">
                    <code
                      dangerouslySetInnerHTML={{
                        __html: formatJsonToHtml(generatedJson),
                      }}
                    />
                  </pre>
                </div>
              </>
            ) : (
              <div className="card-box-body empty-blank-panel" />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
