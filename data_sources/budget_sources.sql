-- ==============================================================================
-- Budget Data Sources - State and County Financial Data
-- ==============================================================================

-- California State Budget Sources
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority, notes) VALUES
-- State Controller's Office
('https://bythenumbers.sco.ca.gov/Raw-Data', 'sco.ca.gov', 'CA State Expenditures - By The Numbers', 'Comprehensive state expenditure data including healthcare payments', 'budget', 'CSV', 'quarterly', 10, 'Primary source for state spending data'),
('https://publicpay.ca.gov/Reports/RawExport.aspx', 'publicpay.ca.gov', 'Public Employee Compensation', 'State and local government employee salaries including healthcare workers', 'budget', 'CSV', 'annual', 7, 'Includes public hospital employee salaries'),

-- eBudget Portal
('https://ebudget.ca.gov/budget/publication/', 'ebudget.ca.gov', 'California State Budget', 'Annual state budget with healthcare allocations', 'budget', 'PDF', 'annual', 9, 'Governor''s budget proposals and enacted budgets'),
('https://ebudget.ca.gov/opendata/', 'ebudget.ca.gov', 'eBudget Open Data', 'Machine-readable budget data', 'budget', 'JSON', 'annual', 10, 'Structured budget data for automated parsing'),

-- Legislative Analyst's Office
('https://lao.ca.gov/Publications/Report', 'lao.ca.gov', 'LAO Budget Analysis', 'Independent analysis of state budget and healthcare spending', 'budget', 'PDF', 'annual', 8, 'Includes healthcare spending analysis'),

-- Department of Finance
('https://dof.ca.gov/budget/state-budget-resources/', 'dof.ca.gov', 'State Budget Resources', 'Department of Finance budget documents and data', 'budget', 'Excel', 'annual', 9, 'Historical budget data and forecasts'),

-- Healthcare-Specific State Budgets
('https://www.dhcs.ca.gov/dataandstats/statistics/Pages/default.aspx', 'dhcs.ca.gov', 'DHCS Budget and Statistics', 'Department of Health Care Services budget and expenditure data', 'budget', 'Excel', 'quarterly', 10, 'Medi-Cal budget and spending'),
('https://www.dhcs.ca.gov/provgovpart/Pages/Fiscal-Forecasting-and-Analytics.aspx', 'dhcs.ca.gov', 'DHCS Fiscal Forecasting', 'Healthcare budget forecasting and analytics', 'budget', 'Excel', 'monthly', 9, 'Real-time fiscal monitoring');

-- Major County Budget Sources (Top 10 by population)
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority, notes) VALUES
-- Los Angeles County
('https://ceo.lacounty.gov/budget/', 'lacounty.gov', 'LA County Budget', 'Los Angeles County annual budget including Department of Health Services', 'budget', 'PDF', 'annual', 10, 'Largest county healthcare budget in CA'),
('https://data.lacounty.gov/browse?q=budget', 'data.lacounty.gov', 'LA County Open Data - Budget', 'LA County budget datasets', 'budget', 'CSV', 'annual', 9, 'Open data portal for budget information'),

-- San Diego County
('https://www.sandiegocounty.gov/cob/budget.html', 'sandiegocounty.gov', 'San Diego County Budget', 'San Diego County annual budget', 'budget', 'PDF', 'annual', 9, 'Includes Health & Human Services Agency budget'),
('https://data.sandiegocounty.gov/browse?q=budget', 'data.sandiegocounty.gov', 'San Diego County Open Data - Budget', 'San Diego County budget data', 'budget', 'CSV', 'annual', 8, 'Machine-readable budget data'),

-- Orange County
('https://ceo.ocgov.com/divisions/finance/budget', 'ocgov.com', 'Orange County Budget', 'Orange County annual budget', 'budget', 'PDF', 'annual', 9, 'Healthcare spending in OC Health Care Agency'),

-- Riverside County
('https://rivco.org/budget', 'rivco.org', 'Riverside County Budget', 'Riverside County annual budget', 'budget', 'PDF', 'annual', 8, 'Public health and behavioral health budgets'),

-- San Bernardino County
('https://sbcounty.gov/cao/budget/', 'sbcounty.gov', 'San Bernardino County Budget', 'San Bernardino County budget', 'budget', 'PDF', 'annual', 8, 'Department of Behavioral Health budget'),

-- Santa Clara County
('https://budget.sccgov.org/', 'sccgov.org', 'Santa Clara County Budget', 'Santa Clara County budget portal', 'budget', 'PDF', 'annual', 9, 'Major healthcare spending county'),
('https://data.sccgov.org/browse?q=budget', 'data.sccgov.org', 'Santa Clara County Open Data - Budget', 'Santa Clara budget datasets', 'budget', 'CSV', 'annual', 8, 'Open data budget information'),

-- Alameda County
('https://www.acgov.org/cao/budget/', 'acgov.org', 'Alameda County Budget', 'Alameda County annual budget', 'budget', 'PDF', 'annual', 8, 'Healthcare Services budget'),

-- Sacramento County
('https://budget.saccounty.net/', 'saccounty.net', 'Sacramento County Budget', 'Sacramento County budget information', 'budget', 'PDF', 'annual', 8, 'Department of Health Services budget'),

-- Contra Costa County
('https://www.contracosta.ca.gov/1024/County-Budget', 'contracosta.ca.gov', 'Contra Costa County Budget', 'Contra Costa County budget', 'budget', 'PDF', 'annual', 7, 'Health Services budget'),

-- Fresno County
('https://www.co.fresno.ca.us/departments/county-administrative-office/budget-fiscal-planning', 'co.fresno.ca.us', 'Fresno County Budget', 'Fresno County budget documents', 'budget', 'PDF', 'annual', 7, 'Public health budget');

-- Additional Budget-Related Sources
INSERT OR IGNORE INTO data_sources (url, domain, title, description, data_type, format, update_frequency, priority, notes) VALUES
-- Financial Reports
('https://sco.ca.gov/ppsd_local_gaa.html', 'sco.ca.gov', 'Cities Annual Report', 'Annual financial reports for California cities', 'budget', 'Excel', 'annual', 6, 'City-level healthcare spending'),
('https://sco.ca.gov/ppsd_localgov_reporting_counties.html', 'sco.ca.gov', 'Counties Annual Report', 'Annual financial reports for California counties', 'budget', 'Excel', 'annual', 9, 'County financial data'),

-- Auditor Reports
('https://www.bsa.ca.gov/reports', 'bsa.ca.gov', 'CA State Auditor Reports', 'Independent audits including healthcare programs', 'budget', 'PDF', 'ongoing', 8, 'Healthcare fraud and waste audits'),

-- Pension and Benefits
('https://www.calpers.ca.gov/page/employers/reports-data/employer-statistics', 'calpers.ca.gov', 'CalPERS Employer Statistics', 'Public employee pension data including healthcare workers', 'budget', 'PDF', 'annual', 6, 'Healthcare worker pension costs'),

-- Federal-State Programs
('https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-provider-cost-report/hospital-cost-report-public-use-file', 'cms.gov', 'Medicare Cost Reports', 'Hospital cost reports for California facilities', 'budget', 'CSV', 'annual', 10, 'Federal reimbursement and cost data');
