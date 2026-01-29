# Ethical Data Collection Policy

## 🤝 Our Commitment to Responsible Data Collection

The Hippocratic project is committed to ethical and responsible collection of public government data. We believe in transparency, accountability, and respect for the infrastructure that serves the public.

## 📜 Guiding Principles

### 1. **Public Good Mission**
- Our purpose is **healthcare fraud detection** to protect vulnerable patients
- All data collected is **publicly available government data**
- Research is **non-commercial** and **academic** in nature
- Results benefit **public health oversight**

### 2. **Respect for Infrastructure**
We implement multiple safeguards to avoid burdening government servers:

✅ **Rate Limiting**: Minimum 3 seconds between requests (more conservative than industry standard)  
✅ **Robots.txt Compliance**: We always check and respect robots.txt directives  
✅ **Proper Identification**: User-Agent clearly identifies our bot and purpose  
✅ **Contact Information**: Email provided for server administrators  
✅ **Off-Peak Scheduling**: GitHub Actions run during low-traffic hours (6 AM UTC)  
✅ **Retry Limits**: Maximum 2 retries to avoid hammering servers  
✅ **Exponential Backoff**: If rate-limited (429), we back off exponentially  

### 3. **Transparency**
- **Open Source**: All code is publicly available on GitHub
- **Activity Logging**: All collection activities logged to `collection_log.jsonl`
- **Clear Purpose**: Headers include purpose and contact information
- **Public Documentation**: This policy is public and prominent

### 4. **Legal Compliance**
- Only access **publicly available** government data
- Respect **Terms of Service** for all data portals
- Honor **robots.txt** and **access restrictions**
- Do not circumvent **authentication** or **paywalls**
- Comply with **CFAA** (Computer Fraud and Abuse Act)

## 🛡️ Technical Safeguards

### Rate Limiting
```python
# Default: 3 seconds between requests to same domain
rate_limit_delay = 3.0

# With random jitter to avoid thundering herd
sleep_time += random.uniform(0, 0.5)
```

### User-Agent Identification
```
HippocraticBot/1.0 
(+https://github.com/SoMaCoSF/hippocratic; 
Academic/Research: California Healthcare Fraud Detection; 
Contact: somacosf@gmail.com)
```

### Robots.txt Compliance
```python
# Always check robots.txt before scraping
respect_robots_txt = True

# Skip URLs blocked by robots.txt
if not scraper._check_robots_txt(url):
    logger.error(f"Skipping {url} - blocked by robots.txt")
    return None
```

### Request Headers
```http
User-Agent: HippocraticBot/1.0 (...)
From: somacosf@gmail.com
X-Purpose: Healthcare Fraud Detection Research
X-Institution: Hippocratic Project
X-Contact: somacosf@gmail.com
```

### Error Handling
```python
# Respect 429 (Too Many Requests)
if status_code == 429:
    backoff_time = rate_limit_delay * (2 ** attempt)
    logger.warning(f"Rate limited - backing off {backoff_time}s")

# Respect 403 (Forbidden)
if status_code in [403, 451]:
    logger.error(f"Access forbidden - stopping")
    return None
```

## 📊 Data Collection Practices

### What We Collect
- ✅ Public facility listings (CDPH, HCAI)
- ✅ Financial disclosures (required by law)
- ✅ Budget documents (public records)
- ✅ Licensing information (public registry)
- ✅ Utilization reports (public health data)

### What We DON'T Collect
- ❌ Patient health information (PHI/PII)
- ❌ Internal government documents
- ❌ Non-public databases
- ❌ Personal employee information
- ❌ Confidential business data

### Frequency
- **GitHub Actions**: Once per week (4 different days)
- **API Calls**: Maximum once per day per endpoint
- **Web Scraping**: Maximum 20 requests/minute (1 per 3 seconds)
- **Heavy Data**: Monthly maximum for large datasets

## 🔍 Monitoring & Accountability

### Activity Logging
Every data collection operation is logged:
```json
{
  "timestamp": "2026-01-29T12:34:56",
  "source": "data.ca.gov",
  "success": true,
  "records": 1234,
  "user_agent": "HippocraticBot/1.0 (...)"
}
```

### GitHub Transparency
- All scraper code is **open source**
- All workflow runs are **visible** in GitHub Actions
- Commit history shows **what data was collected when**

### Audit Trail
- Database tracks **ingestion logs**
- Dashboard displays **collection history**
- Errors are logged and **investigated**

## 📧 Contact & Cooperation

### Server Administrator Notice

If you are a government server administrator and have concerns about our data collection:

**We are happy to:**
- Reduce our request rate
- Limit collection to specific times
- Use alternative access methods (APIs, bulk downloads)
- Coordinate large data transfers
- Add your domain to our exclusion list

**Please contact us:**
- **Email**: somacosf@gmail.com
- **GitHub**: https://github.com/SoMaCoSF/hippocratic/issues
- **Response Time**: Within 24 hours

### Preferred Communication
We prefer to work **with** government IT teams, not against them. We're open to:
- Using official **API endpoints** instead of scraping
- Scheduling downloads during **maintenance windows**
- Accepting **bulk data exports** instead of individual requests
- Coordinating with **data governance** teams

## 🚨 If We're Causing Issues

### Immediate Actions
If our bot is causing problems:

1. **robots.txt**: Update your robots.txt and we'll respect it immediately
2. **Email us**: somacosf@gmail.com - we'll pause operations
3. **Block us**: We won't attempt to circumvent blocks
4. **Rate limit us**: We'll honor 429 responses and back off

### We Will NOT
- ❌ Circumvent blocks or rate limits
- ❌ Spoof user agents to appear as browsers
- ❌ Use distributed IPs to bypass restrictions
- ❌ Ignore robots.txt or access restrictions
- ❌ Continue after receiving cease & desist

## ✅ Best Practices We Follow

Based on industry standards and legal guidance:

1. ✅ **Identify clearly** in User-Agent
2. ✅ **Provide contact email** in headers
3. ✅ **Respect robots.txt** 100%
4. ✅ **Rate limit conservatively** (3s minimum)
5. ✅ **Honor retry-after** headers
6. ✅ **Use API when available**
7. ✅ **Cache aggressively** to reduce requests
8. ✅ **Schedule during off-peak** hours
9. ✅ **Log all activity** for transparency
10. ✅ **Respond promptly** to concerns

## 📚 Legal References

### Computer Fraud and Abuse Act (CFAA)
- We access only **publicly available** data
- We do not exceed **authorized access**
- We do not cause **damage** or **impairment**

### Terms of Service
- We review and comply with **TOS** for each portal
- We use **official APIs** when available
- We respect **access restrictions**

### Public Records Law
- California Public Records Act (CPRA) affirms our right to access public data
- Government Codes §6250-6270 protect access to public records
- We collect only data **required to be public** by law

## 🎯 Our Promise

We promise to:
- ✅ Be a **good citizen** of the web
- ✅ Respect **server resources**
- ✅ Respond **immediately** to concerns
- ✅ Prioritize **cooperation** over circumvention
- ✅ Use data **ethically** for public good
- ✅ Maintain **transparency** in all operations

## 📝 Policy Updates

This policy may be updated as we refine our practices. Changes will be:
- Committed to GitHub with clear descriptions
- Made more restrictive (never less)
- Communicated to any stakeholders who have contacted us

**Last Updated**: 2026-01-29  
**Version**: 1.0  
**Contact**: somacosf@gmail.com

---

## 🤝 Thank You

We thank the dedicated public servants who maintain these data portals and make government transparency possible. Our research relies on your infrastructure, and we're committed to being respectful users of these valuable public resources.

**California Healthcare Fraud Detection is a public good.**  
**Ethical data collection is how we achieve it.**
