-- ==============================================================================
-- Seed Data: California .gov Data Sources
-- Initial set of known data sources for ingestion
-- ==============================================================================

-- CHHS Open Data Portal Datasets
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://data.chhs.ca.gov/dataset/healthcare-facility-locations', 'data.chhs.ca.gov', 'Healthcare Facility Locations', 'Comprehensive list of all licensed healthcare facilities in California', 'facilities', 'JSON', 'monthly', 10),
('https://data.chhs.ca.gov/dataset/licensed-and-certified-healthcare-facility-listing', 'data.chhs.ca.gov', 'Licensed Healthcare Facilities', 'Current licensing status of all healthcare facilities', 'licensing', 'CSV', 'daily', 9),
('https://data.chhs.ca.gov/dataset/hospital-annual-financial-data', 'data.chhs.ca.gov', 'Hospital Financial Data', 'Annual financial reports from California hospitals', 'financial', 'CSV', 'annual', 10);

-- HCAI Data Sources
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://hcai.ca.gov/data-and-reports/cost-transparency/hospital-financial-data/', 'hcai.ca.gov', 'Hospital Financial Reports', 'Detailed hospital financial and utilization data', 'financial', 'Excel', 'annual', 10),
('https://hcai.ca.gov/data-and-reports/healthcare-facility-data/', 'hcai.ca.gov', 'Healthcare Facility Data', 'Facility characteristics and services', 'facilities', 'CSV', 'quarterly', 8),
('https://hcai.ca.gov/data-and-reports/healthcare-workforce/', 'hcai.ca.gov', 'Healthcare Workforce Data', 'Staffing and workforce statistics', 'workforce', 'Excel', 'annual', 6);

-- CDPH Data Sources
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://www.cdph.ca.gov/Programs/CHCQ/LCP/CDPH%20Document%20Library/LNC-AFL-FacilityList.xlsx', 'cdph.ca.gov', 'Facility List', 'Master facility listing with license numbers', 'facilities', 'Excel', 'monthly', 9),
('https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/HFCLD.aspx', 'cdph.ca.gov', 'Healthcare Facility Consumer Info', 'Public facility information and complaint data', 'inspection', 'HTML', 'daily', 7),
('https://www.cdph.ca.gov/Programs/CHCQ/HAI/Pages/ProgramHome.aspx', 'cdph.ca.gov', 'Healthcare-Associated Infections', 'Hospital infection rates and quality metrics', 'quality', 'CSV', 'quarterly', 8);

-- CDSS Data Sources
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://www.cdss.ca.gov/inforesources/community-care-licensing', 'cdss.ca.gov', 'Community Care Licensing', 'Adult and senior care facility licensing', 'licensing', 'CSV', 'monthly', 7),
('https://www.cdss.ca.gov/Portals/9/CCL/CCLD_Search/ccld_search.aspx', 'cdss.ca.gov', 'CCL Facility Search', 'Searchable database of community care facilities', 'facilities', 'API', 'daily', 6);

-- CMS (Federal - California subset)
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://data.cms.gov/provider-data/dataset/xubh-q36u', 'data.cms.gov', 'Hospital General Information', 'Medicare hospital data for California', 'facilities', 'JSON', 'quarterly', 8),
('https://data.cms.gov/provider-data/dataset/77hc-ibv8', 'data.cms.gov', 'Nursing Home Compare', 'Nursing home quality and inspection data', 'quality', 'JSON', 'monthly', 7),
('https://data.cms.gov/provider-data/dataset/6jpm-sxkc', 'data.cms.gov', 'Home Health Compare', 'Home health agency quality data', 'quality', 'JSON', 'quarterly', 7),
('https://data.cms.gov/provider-compliance/cost-report', 'data.cms.gov', 'Medicare Cost Reports', 'Detailed financial data from Medicare providers', 'financial', 'CSV', 'annual', 9);

-- Data.ca.gov Portal
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://data.ca.gov/api/3/action/package_list', 'data.ca.gov', 'Data Portal Package List', 'List of all datasets on California Open Data Portal', 'meta', 'JSON', 'daily', 10),
('https://data.ca.gov/dataset/healthcare-facility-locations', 'data.ca.gov', 'Healthcare Facilities', 'Statewide healthcare facility locations', 'facilities', 'CSV', 'monthly', 9);

-- Medical Board of California
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority) VALUES
('https://www.mbc.ca.gov/Breeze/License_Verification.aspx', 'mbc.ca.gov', 'Physician License Verification', 'Physician licensing and disciplinary actions', 'licensing', 'API', 'daily', 6),
('https://www.mbc.ca.gov/About_Us/Statistics/', 'mbc.ca.gov', 'Medical Board Statistics', 'Licensing and enforcement statistics', 'statistics', 'PDF', 'annual', 5);
