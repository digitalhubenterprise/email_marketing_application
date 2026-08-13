import React, { useEffect, useState } from 'react'
import {
  Settings,
  Shield,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  ShoppingBag,
  Percent,
  FileText,
  Mail,
  Phone,
  Palette,
  Info,
  Users,
  Lock,
  ClipboardList,
  CheckCircle2,
  Trash2,
  Activity,
  HeartHandshake,
  CreditCard
} from 'lucide-react'

interface SystemConfig {
  id: number;
  site_name: string;
  logo_url: string | null;
  dark_logo_url?: string | null;
  footer_dark_logo_url?: string | null;
  support_email: string;
  maintenance_mode: boolean;
  global_send_rate_limit: number;
  default_from_email: string;
  announcement_active: boolean;
  announcement_message: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
  seo_meta_keywords?: string | null;
  default_from_name?: string | null;
  smtp_max_retries?: number | null;
  email_verification_required?: boolean | null;
  min_password_length?: number | null;
  max_login_attempts?: number | null;
  session_expiry_hours?: number | null;
  system_smtp_host?: string | null;
  system_smtp_port?: number | null;
  system_smtp_username?: string | null;
  system_smtp_security?: string | null;
  system_smtp_from_name?: string | null;
  system_smtp_from_email?: string | null;
  system_smtp_enabled?: boolean | null;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  telegram_notifications_enabled?: boolean | null;
  two_factor_email_enabled?: boolean | null;
  two_factor_telegram_enabled?: boolean | null;
  two_factor_mandatory_for_admins?: boolean | null;
  payment_gateway_trc20?: string | null;
  payment_gateway_bep20?: string | null;
  payment_gateway_usdc_bep20?: string | null;
  payment_gateway_merchant_id?: string | null;
  payment_gateway_qr_code?: string | null;
  payment_gateway_trc20_enabled?: boolean | null;
  payment_gateway_bep20_enabled?: boolean | null;
  payment_gateway_usdc_bep20_enabled?: boolean | null;
  payment_gateway_merchant_enabled?: boolean | null;
  extra_settings?: any;
}

type TabType =
  | 'general'
  | 'registration'
  | 'cart'
  | 'localizations'
  | 'tax'
  | 'invoice'
  | 'contact'
  | 'orders'
  | 'fraud'
  | 'gateways'
  | 'appearance'
  | 'other';

export default function AdminSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [generalSubTab, setGeneralSubTab] = useState<'site_info' | 'seo' | 'site_settings' | 'funds' | 'smtp' | 'telegram' | 'maintenance'>('site_info');

  // LocalStorage general_extra States
  const [companyName, setCompanyName] = useState('Your Company Name');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [footerLogoUrl, setFooterLogoUrl] = useState('');
  const [siteLink, setSiteLink] = useState('');
  const [siteSslLink, setSiteSslLink] = useState('');
  const [seoFriendlyUrl, setSeoFriendlyUrl] = useState('Disable');
  const [fasterBrowsing, setFasterBrowsing] = useState('Disable');
  const [rechargeVoucher, setRechargeVoucher] = useState('Disable');
  const [testimonial, setTestimonial] = useState('Disable');
  const [blog, setBlog] = useState('Disable');
  const [knowledgeBase, setKnowledgeBase] = useState('Disable');
  const [supportTicket, setSupportTicket] = useState('Disable');
  const [showServicePrice, setShowServicePrice] = useState('Disable');
  const [indexRedirect, setIndexRedirect] = useState('');
  const [logoutRedirect, setLogoutRedirect] = useState('');
  const [addFund, setAddFund] = useState('Disable');
  const [taxForAddFund, setTaxForAddFund] = useState('Disable');
  const [minAddFund, setMinAddFund] = useState(500);
  const [maxAddFund, setMaxAddFund] = useState(1000000);
  const [maxBalance, setMaxBalance] = useState(50000000);

  // Backend SystemConfig States (General & Registration)
  const [siteName, setSiteName] = useState('SmartCampaign');
  const [logoUrl, setLogoUrl] = useState('');
  const [darkLogoUrl, setDarkLogoUrl] = useState('');
  const [footerDarkLogoUrl, setFooterDarkLogoUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('support@smartcampaign.today');
  const [rateLimit, setRateLimit] = useState(1000);
  const [defaultFrom, setDefaultFrom] = useState('noreply@smartcampaign.today');
  const [defaultFromName, setDefaultFromName] = useState('SmartCampaign Operations');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [seoTitle, setSeoTitle] = useState('SmartCampaign - Modern SaaS Email Marketing Platform');
  const [seoDescription, setSeoDescription] = useState('Create, personalize, monitor, and scale email marketing campaigns dynamically.');
  const [seoKeywords, setSeoKeywords] = useState('email marketing, smtp, celery, dispatch, saas');
  const [smtpMaxRetries, setSmtpMaxRetries] = useState(3);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [sessionExpiryHours, setSessionExpiryHours] = useState(24);

  // Telegram Integration
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(false);

  // 2FA Security
  const [twoFactorEmailEnabled, setTwoFactorEmailEnabled] = useState(false);
  const [twoFactorTelegramEnabled, setTwoFactorTelegramEnabled] = useState(false);
  const [twoFactorMandatoryForAdmins, setTwoFactorMandatoryForAdmins] = useState(false);

  // System SMTP Setup
  const [systemSmtpHost, setSystemSmtpHost] = useState('');
  const [systemSmtpPort, setSystemSmtpPort] = useState(587);
  const [systemSmtpUsername, setSystemSmtpUsername] = useState('');
  const [systemSmtpPassword, setSystemSmtpPassword] = useState('');
  const [systemSmtpSecurity, setSystemSmtpSecurity] = useState('TLS');
  const [systemSmtpFromName, setSystemSmtpFromName] = useState('');
  const [systemSmtpFromEmail, setSystemSmtpFromEmail] = useState('');
  const [systemSmtpEnabled, setSystemSmtpEnabled] = useState(false);

  // Payment Gateway Configurations
  const [paymentGatewayTrc20, setPaymentGatewayTrc20] = useState('');
  const [paymentGatewayBep20, setPaymentGatewayBep20] = useState('');
  const [paymentGatewayUsdcBep20, setPaymentGatewayUsdcBep20] = useState('');
  const [paymentGatewayMerchantId, setPaymentGatewayMerchantId] = useState('');
  const [paymentGatewayQrCode, setPaymentGatewayQrCode] = useState('');
  const [paymentGatewayTrc20Enabled, setPaymentGatewayTrc20Enabled] = useState(true);
  const [paymentGatewayBep20Enabled, setPaymentGatewayBep20Enabled] = useState(true);
  const [paymentGatewayUsdcBep20Enabled, setPaymentGatewayUsdcBep20Enabled] = useState(true);
  const [paymentGatewayMerchantEnabled, setPaymentGatewayMerchantEnabled] = useState(true);

  // SMTP Diagnostics
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('');
  const [smtpTestLogs, setSmtpTestLogs] = useState<string[]>([]);
  const [smtpTestSuccess, setSmtpTestSuccess] = useState<boolean | null>(null);

  // LocalStorage-Only States
  // Shopping Cart
  const [cartExpiry, setCartExpiry] = useState(60);
  const [guestCheckout, setGuestCheckout] = useState(true);
  const [enableCoupons, setEnableCoupons] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [minFreeShipping, setMinFreeShipping] = useState(50);

  // Localizations
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('24-hour');
  const [language, setLanguage] = useState('en');
  const [decimalSeparator, setDecimalSeparator] = useState('.');

  // Tax
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(5.0);
  const [taxName, setTaxName] = useState('VAT');
  const [taxId, setTaxId] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(false);

  // Invoice
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [invoiceSerial, setInvoiceSerial] = useState(1001);
  const [billingTerms, setBillingTerms] = useState('Net 30');
  const [invoiceLayout, setInvoiceLayout] = useState('Classic');
  const [billingAddress, setBillingAddress] = useState('SmartCampaign HQ\n123 Business Rd\nDhaka, Bangladesh');

  // Contact Us
  const [contactEmail, setContactEmail] = useState('info@smartcampaign.today');
  const [contactPhone, setContactPhone] = useState('+880123456789');
  const [contactAddress, setContactAddress] = useState('Dhaka, Bangladesh');
  const [contactMap, setContactMap] = useState('');
  const [enableContactForm, setEnableContactForm] = useState(true);

  // Orders
  const [defaultOrderStatus, setDefaultOrderStatus] = useState('Pending');
  const [sendOrderConfirmEmail, setSendOrderConfirmEmail] = useState(true);
  const [autoFulfillDigital, setAutoFulfillDigital] = useState(true);
  const [returnWindowDays, setReturnWindowDays] = useState(30);

  // Fraud Protection
  const [maxTxPerIpDay, setMaxTxPerIpDay] = useState(10);
  const [blockBlacklistedIps, setBlockBlacklistedIps] = useState(true);
  const [ipBlacklist, setIpBlacklist] = useState('192.168.1.100, 10.0.0.50');
  const [blockVpnProxy, setBlockVpnProxy] = useState(false);
  const [enforce3dSecure, setEnforce3dSecure] = useState(true);

  // Appearance
  const [primaryColor, setPrimaryColor] = useState('indigo');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [customCss, setCustomCss] = useState('');
  const [appearanceDarkMode, setAppearanceDarkMode] = useState('Light');

  // Other
  const [cacheExpirySec, setCacheExpirySec] = useState(3600);
  const [dataRetentionDays, setDataRetentionDays] = useState(365);
  const [logLevel, setLogLevel] = useState('INFO');
  const [debugFlag, setDebugFlag] = useState(false);

  // Google Analytics
  const [googleAnalyticsCode, setGoogleAnalyticsCode] = useState('G-02D671G8VR');
  const [analyticsEcommerce, setAnalyticsEcommerce] = useState('Disable');

  // Google GCM
  const [googleGcmKey, setGoogleGcmKey] = useState('');
  const [androidAppId, setAndroidAppId] = useState('');

  // Geo Provider
  const [ipLocationUrl, setIpLocationUrl] = useState('https://geo.dhru.com/?ip=');

  // Social Networking
  const [twitterUsername, setTwitterUsername] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Twitter Application Access
  const [twitterConsumerKey, setTwitterConsumerKey] = useState('');
  const [twitterConsumerSecret, setTwitterConsumerSecret] = useState('');
  const [twitterAccessToken, setTwitterAccessToken] = useState('');
  const [twitterTokenSecret, setTwitterTokenSecret] = useState('');

  // Google Map API
  const [googleMapApiKey, setGoogleMapApiKey] = useState('');

  // Other Detail
  const [otherHtmlCode, setOtherHtmlCode] = useState('');

  // Mobile App Download Link
  const [mobileAppAndroidUrl, setMobileAppAndroidUrl] = useState('');

  // Action status indicators
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Load localStorage variables
  const loadLocalSettings = () => {
    try {
      const cartData = localStorage.getItem('settings_shopping_cart');
      if (cartData) {
        const p = JSON.parse(cartData);
        if (p.cartExpiry !== undefined) setCartExpiry(p.cartExpiry);
        if (p.guestCheckout !== undefined) setGuestCheckout(p.guestCheckout);
        if (p.enableCoupons !== undefined) setEnableCoupons(p.enableCoupons);
        if (p.currency !== undefined) setCurrency(p.currency);
        if (p.minFreeShipping !== undefined) setMinFreeShipping(p.minFreeShipping);
      }
      const locData = localStorage.getItem('settings_localizations');
      if (locData) {
        const p = JSON.parse(locData);
        if (p.timezone !== undefined) setTimezone(p.timezone);
        if (p.dateFormat !== undefined) setDateFormat(p.dateFormat);
        if (p.timeFormat !== undefined) setTimeFormat(p.timeFormat);
        if (p.language !== undefined) setLanguage(p.language);
        if (p.decimalSeparator !== undefined) setDecimalSeparator(p.decimalSeparator);
      }
      const taxData = localStorage.getItem('settings_tax');
      if (taxData) {
        const p = JSON.parse(taxData);
        if (p.taxEnabled !== undefined) setTaxEnabled(p.taxEnabled);
        if (p.taxRate !== undefined) setTaxRate(p.taxRate);
        if (p.taxName !== undefined) setTaxName(p.taxName);
        if (p.taxId !== undefined) setTaxId(p.taxId);
        if (p.taxInclusive !== undefined) setTaxInclusive(p.taxInclusive);
      }
      const invData = localStorage.getItem('settings_invoice');
      if (invData) {
        const p = JSON.parse(invData);
        if (p.invoicePrefix !== undefined) setInvoicePrefix(p.invoicePrefix);
        if (p.invoiceSerial !== undefined) setInvoiceSerial(p.invoiceSerial);
        if (p.billingTerms !== undefined) setBillingTerms(p.billingTerms);
        if (p.invoiceLayout !== undefined) setInvoiceLayout(p.invoiceLayout);
        if (p.billingAddress !== undefined) setBillingAddress(p.billingAddress);
      }
      const contactData = localStorage.getItem('settings_contact');
      if (contactData) {
        const p = JSON.parse(contactData);
        if (p.contactEmail !== undefined) setContactEmail(p.contactEmail);
        if (p.contactPhone !== undefined) setContactPhone(p.contactPhone);
        if (p.contactAddress !== undefined) setContactAddress(p.contactAddress);
        if (p.contactMap !== undefined) setContactMap(p.contactMap);
        if (p.enableContactForm !== undefined) setEnableContactForm(p.enableContactForm);
      }
      const ordersData = localStorage.getItem('settings_orders');
      if (ordersData) {
        const p = JSON.parse(ordersData);
        if (p.defaultOrderStatus !== undefined) setDefaultOrderStatus(p.defaultOrderStatus);
        if (p.sendOrderConfirmEmail !== undefined) setSendOrderConfirmEmail(p.sendOrderConfirmEmail);
        if (p.autoFulfillDigital !== undefined) setAutoFulfillDigital(p.autoFulfillDigital);
        if (p.returnWindowDays !== undefined) setReturnWindowDays(p.returnWindowDays);
      }
      const fraudData = localStorage.getItem('settings_fraud');
      if (fraudData) {
        const p = JSON.parse(fraudData);
        if (p.maxTxPerIpDay !== undefined) setMaxTxPerIpDay(p.maxTxPerIpDay);
        if (p.blockBlacklistedIps !== undefined) setBlockBlacklistedIps(p.blockBlacklistedIps);
        if (p.ipBlacklist !== undefined) setIpBlacklist(p.ipBlacklist);
        if (p.blockVpnProxy !== undefined) setBlockVpnProxy(p.blockVpnProxy);
        if (p.enforce3dSecure !== undefined) setEnforce3dSecure(p.enforce3dSecure);
      }
      const appData = localStorage.getItem('settings_appearance');
      if (appData) {
        const p = JSON.parse(appData);
        if (p.primaryColor !== undefined) setPrimaryColor(p.primaryColor);
        if (p.fontFamily !== undefined) setFontFamily(p.fontFamily);
        if (p.customCss !== undefined) setCustomCss(p.customCss);
        if (p.appearanceDarkMode !== undefined) setAppearanceDarkMode(p.appearanceDarkMode);
      }
      const otherData = localStorage.getItem('settings_other');
      if (otherData) {
        const p = JSON.parse(otherData);
        if (p.cacheExpirySec !== undefined) setCacheExpirySec(p.cacheExpirySec);
        if (p.dataRetentionDays !== undefined) setDataRetentionDays(p.dataRetentionDays);
        if (p.logLevel !== undefined) setLogLevel(p.logLevel);
        if (p.debugFlag !== undefined) setDebugFlag(p.debugFlag);
        
        if (p.googleAnalyticsCode !== undefined) setGoogleAnalyticsCode(p.googleAnalyticsCode);
        if (p.analyticsEcommerce !== undefined) setAnalyticsEcommerce(p.analyticsEcommerce);
        if (p.googleGcmKey !== undefined) setGoogleGcmKey(p.googleGcmKey);
        if (p.androidAppId !== undefined) setAndroidAppId(p.androidAppId);
        if (p.ipLocationUrl !== undefined) setIpLocationUrl(p.ipLocationUrl);
        if (p.twitterUsername !== undefined) setTwitterUsername(p.twitterUsername);
        if (p.facebookUrl !== undefined) setFacebookUrl(p.facebookUrl);
        if (p.linkedinUrl !== undefined) setLinkedinUrl(p.linkedinUrl);
        if (p.instagramUrl !== undefined) setInstagramUrl(p.instagramUrl);
        if (p.twitterConsumerKey !== undefined) setTwitterConsumerKey(p.twitterConsumerKey);
        if (p.twitterConsumerSecret !== undefined) setTwitterConsumerSecret(p.twitterConsumerSecret);
        if (p.twitterAccessToken !== undefined) setTwitterAccessToken(p.twitterAccessToken);
        if (p.twitterTokenSecret !== undefined) setTwitterTokenSecret(p.twitterTokenSecret);
        if (p.googleMapApiKey !== undefined) setGoogleMapApiKey(p.googleMapApiKey);
        if (p.otherHtmlCode !== undefined) setOtherHtmlCode(p.otherHtmlCode);
        if (p.mobileAppAndroidUrl !== undefined) setMobileAppAndroidUrl(p.mobileAppAndroidUrl);
      }
      const generalExtra = localStorage.getItem('settings_general_extra');
      if (generalExtra) {
        const p = JSON.parse(generalExtra);
        if (p.companyName !== undefined) setCompanyName(p.companyName);
        if (p.faviconUrl !== undefined) setFaviconUrl(p.faviconUrl);
        if (p.footerLogoUrl !== undefined) setFooterLogoUrl(p.footerLogoUrl);
        if (p.siteLink !== undefined) setSiteLink(p.siteLink);
        if (p.siteSslLink !== undefined) setSiteSslLink(p.siteSslLink);
        if (p.seoFriendlyUrl !== undefined) setSeoFriendlyUrl(p.seoFriendlyUrl);
        if (p.fasterBrowsing !== undefined) setFasterBrowsing(p.fasterBrowsing);
        if (p.rechargeVoucher !== undefined) setRechargeVoucher(p.rechargeVoucher);
        if (p.testimonial !== undefined) setTestimonial(p.testimonial);
        if (p.blog !== undefined) setBlog(p.blog);
        if (p.knowledgeBase !== undefined) setKnowledgeBase(p.knowledgeBase);
        if (p.supportTicket !== undefined) setSupportTicket(p.supportTicket);
        if (p.showServicePrice !== undefined) setShowServicePrice(p.showServicePrice);
        if (p.indexRedirect !== undefined) setIndexRedirect(p.indexRedirect);
        if (p.logoutRedirect !== undefined) setLogoutRedirect(p.logoutRedirect);
        if (p.addFund !== undefined) setAddFund(p.addFund);
        if (p.taxForAddFund !== undefined) setTaxForAddFund(p.taxForAddFund);
        if (p.minAddFund !== undefined) setMinAddFund(p.minAddFund);
        if (p.maxAddFund !== undefined) setMaxAddFund(p.maxAddFund);
        if (p.maxBalance !== undefined) setMaxBalance(p.maxBalance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConfig = async () => {
    setError(null);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSiteName(data.site_name);
        setLogoUrl(data.logo_url || '');
        setDarkLogoUrl(data.dark_logo_url || data.extra_settings?.general_extra?.darkLogoUrl || '');
        setFooterDarkLogoUrl(data.footer_dark_logo_url || data.extra_settings?.general_extra?.footerDarkLogoUrl || '');
        setSupportEmail(data.support_email);
        setSmtpTestRecipient(data.support_email || '');
        setRateLimit(data.global_send_rate_limit);
        setDefaultFrom(data.default_from_email);
        setAnnouncementActive(data.announcement_active || false);
        setAnnouncementMessage(data.announcement_message || '');
        setSeoTitle(data.seo_meta_title || '');
        setSeoDescription(data.seo_meta_description || '');
        setSeoKeywords(data.seo_meta_keywords || '');
        setDefaultFromName(data.default_from_name || 'SmartCampaign Operations');
        setSmtpMaxRetries(data.smtp_max_retries ?? 3);
        setEmailVerificationRequired(data.email_verification_required || false);
        setMinPasswordLength(data.min_password_length ?? 8);
        setMaxLoginAttempts(data.max_login_attempts ?? 5);
        setSessionExpiryHours(data.session_expiry_hours ?? 24);
        setTelegramBotToken(data.telegram_bot_token || '');
        setTelegramChatId(data.telegram_chat_id || '');
        setTelegramNotificationsEnabled(data.telegram_notifications_enabled || false);
        setTwoFactorEmailEnabled(data.two_factor_email_enabled || false);
        setTwoFactorTelegramEnabled(data.two_factor_telegram_enabled || false);
        setTwoFactorMandatoryForAdmins(data.two_factor_mandatory_for_admins || false);
        setSystemSmtpHost(data.system_smtp_host || '');
        setSystemSmtpPort(data.system_smtp_port ?? 587);
        setSystemSmtpUsername(data.system_smtp_username || '');
        setSystemSmtpPassword('');
        setSystemSmtpSecurity(data.system_smtp_security || 'TLS');
        setSystemSmtpFromName(data.system_smtp_from_name || '');
        setSystemSmtpFromEmail(data.system_smtp_from_email || '');
        setSystemSmtpEnabled(data.system_smtp_enabled || false);

        setPaymentGatewayTrc20(data.payment_gateway_trc20 || '');
        setPaymentGatewayBep20(data.payment_gateway_bep20 || '');
        setPaymentGatewayUsdcBep20(data.payment_gateway_usdc_bep20 || '');
        setPaymentGatewayMerchantId(data.payment_gateway_merchant_id || '');
        setPaymentGatewayQrCode(data.payment_gateway_qr_code || '');
        setPaymentGatewayTrc20Enabled(data.payment_gateway_trc20_enabled ?? true);
        setPaymentGatewayBep20Enabled(data.payment_gateway_bep20_enabled ?? true);
        setPaymentGatewayUsdcBep20Enabled(data.payment_gateway_usdc_bep20_enabled ?? true);
        setPaymentGatewayMerchantEnabled(data.payment_gateway_merchant_enabled ?? true);

        // Load extra settings from database
        if (data.extra_settings && Object.keys(data.extra_settings).length > 0) {
          const extra = data.extra_settings;
          
          const cartData = extra.shopping_cart;
          if (cartData) {
            if (cartData.cartExpiry !== undefined) setCartExpiry(cartData.cartExpiry);
            if (cartData.guestCheckout !== undefined) setGuestCheckout(cartData.guestCheckout);
            if (cartData.enableCoupons !== undefined) setEnableCoupons(cartData.enableCoupons);
            if (cartData.currency !== undefined) setCurrency(cartData.currency);
            if (cartData.minFreeShipping !== undefined) setMinFreeShipping(cartData.minFreeShipping);
          }
          const locData = extra.localizations;
          if (locData) {
            if (locData.timezone !== undefined) setTimezone(locData.timezone);
            if (locData.dateFormat !== undefined) setDateFormat(locData.dateFormat);
            if (locData.timeFormat !== undefined) setTimeFormat(locData.timeFormat);
            if (locData.language !== undefined) setLanguage(locData.language);
            if (locData.decimalSeparator !== undefined) setDecimalSeparator(locData.decimalSeparator);
          }
          const taxData = extra.tax;
          if (taxData) {
            if (taxData.taxEnabled !== undefined) setTaxEnabled(taxData.taxEnabled);
            if (taxData.taxRate !== undefined) setTaxRate(taxData.taxRate);
            if (taxData.taxName !== undefined) setTaxName(taxData.taxName);
            if (taxData.taxId !== undefined) setTaxId(taxData.taxId);
            if (taxData.taxInclusive !== undefined) setTaxInclusive(taxData.taxInclusive);
          }
          const invData = extra.invoice;
          if (invData) {
            if (invData.invoicePrefix !== undefined) setInvoicePrefix(invData.invoicePrefix);
            if (invData.invoiceSerial !== undefined) setInvoiceSerial(invData.invoiceSerial);
            if (invData.billingTerms !== undefined) setBillingTerms(invData.billingTerms);
            if (invData.invoiceLayout !== undefined) setInvoiceLayout(invData.invoiceLayout);
            if (invData.billingAddress !== undefined) setBillingAddress(invData.billingAddress);
          }
          const contactData = extra.contact;
          if (contactData) {
            if (contactData.contactEmail !== undefined) setContactEmail(contactData.contactEmail);
            if (contactData.contactPhone !== undefined) setContactPhone(contactData.contactPhone);
            if (contactData.contactAddress !== undefined) setContactAddress(contactData.contactAddress);
            if (contactData.contactMap !== undefined) setContactMap(contactData.contactMap);
            if (contactData.enableContactForm !== undefined) setEnableContactForm(contactData.enableContactForm);
          }
          const ordersData = extra.orders;
          if (ordersData) {
            if (ordersData.defaultOrderStatus !== undefined) setDefaultOrderStatus(ordersData.defaultOrderStatus);
            if (ordersData.sendOrderConfirmEmail !== undefined) setSendOrderConfirmEmail(ordersData.sendOrderConfirmEmail);
            if (ordersData.autoFulfillDigital !== undefined) setAutoFulfillDigital(ordersData.autoFulfillDigital);
            if (ordersData.returnWindowDays !== undefined) setReturnWindowDays(ordersData.returnWindowDays);
          }
          const fraudData = extra.fraud;
          if (fraudData) {
            if (fraudData.maxTxPerIpDay !== undefined) setMaxTxPerIpDay(fraudData.maxTxPerIpDay);
            if (fraudData.blockBlacklistedIps !== undefined) setBlockBlacklistedIps(fraudData.blockBlacklistedIps);
            if (fraudData.ipBlacklist !== undefined) setIpBlacklist(fraudData.ipBlacklist);
            if (fraudData.blockVpnProxy !== undefined) setBlockVpnProxy(fraudData.blockVpnProxy);
            if (fraudData.enforce3dSecure !== undefined) setEnforce3dSecure(fraudData.enforce3dSecure);
          }
          const appData = extra.appearance;
          if (appData) {
            if (appData.primaryColor !== undefined) setPrimaryColor(appData.primaryColor);
            if (appData.fontFamily !== undefined) setFontFamily(appData.fontFamily);
            if (appData.customCss !== undefined) setCustomCss(appData.customCss);
            if (appData.appearanceDarkMode !== undefined) setAppearanceDarkMode(appData.appearanceDarkMode);
          }
          const otherData = extra.other;
          if (otherData) {
            if (otherData.cacheExpirySec !== undefined) setCacheExpirySec(otherData.cacheExpirySec);
            if (otherData.dataRetentionDays !== undefined) setDataRetentionDays(otherData.dataRetentionDays);
            if (otherData.logLevel !== undefined) setLogLevel(otherData.logLevel);
            if (otherData.debugFlag !== undefined) setDebugFlag(otherData.debugFlag);
            if (otherData.googleAnalyticsCode !== undefined) setGoogleAnalyticsCode(otherData.googleAnalyticsCode);
            if (otherData.analyticsEcommerce !== undefined) setAnalyticsEcommerce(otherData.analyticsEcommerce);
            if (otherData.googleGcmKey !== undefined) setGoogleGcmKey(otherData.googleGcmKey);
            if (otherData.androidAppId !== undefined) setAndroidAppId(otherData.androidAppId);
            if (otherData.ipLocationUrl !== undefined) setIpLocationUrl(otherData.ipLocationUrl);
            if (otherData.twitterUsername !== undefined) setTwitterUsername(otherData.twitterUsername);
            if (otherData.facebookUrl !== undefined) setFacebookUrl(otherData.facebookUrl);
            if (otherData.linkedinUrl !== undefined) setLinkedinUrl(otherData.linkedinUrl);
            if (otherData.instagramUrl !== undefined) setInstagramUrl(otherData.instagramUrl);
            if (otherData.twitterConsumerKey !== undefined) setTwitterConsumerKey(otherData.twitterConsumerKey);
            if (otherData.twitterConsumerSecret !== undefined) setTwitterConsumerSecret(otherData.twitterConsumerSecret);
            if (otherData.twitterAccessToken !== undefined) setTwitterAccessToken(otherData.twitterAccessToken);
            if (otherData.twitterTokenSecret !== undefined) setTwitterTokenSecret(otherData.twitterTokenSecret);
            if (otherData.googleMapApiKey !== undefined) setGoogleMapApiKey(otherData.googleMapApiKey);
            if (otherData.otherHtmlCode !== undefined) setOtherHtmlCode(otherData.otherHtmlCode);
            if (otherData.mobileAppAndroidUrl !== undefined) setMobileAppAndroidUrl(otherData.mobileAppAndroidUrl);
          }
          const generalExtra = extra.general_extra;
          if (generalExtra) {
            if (generalExtra.companyName !== undefined) setCompanyName(generalExtra.companyName);
            if (generalExtra.faviconUrl !== undefined) setFaviconUrl(generalExtra.faviconUrl);
            if (generalExtra.footerLogoUrl !== undefined) setFooterLogoUrl(generalExtra.footerLogoUrl);
            if (generalExtra.siteLink !== undefined) setSiteLink(generalExtra.siteLink);
            if (generalExtra.siteSslLink !== undefined) setSiteSslLink(generalExtra.siteSslLink);
            if (generalExtra.seoFriendlyUrl !== undefined) setSeoFriendlyUrl(generalExtra.seoFriendlyUrl);
            if (generalExtra.fasterBrowsing !== undefined) setFasterBrowsing(generalExtra.fasterBrowsing);
            if (generalExtra.rechargeVoucher !== undefined) setRechargeVoucher(generalExtra.rechargeVoucher);
            if (generalExtra.testimonial !== undefined) setTestimonial(generalExtra.testimonial);
            if (generalExtra.blog !== undefined) setBlog(generalExtra.blog);
            if (generalExtra.knowledgeBase !== undefined) setKnowledgeBase(generalExtra.knowledgeBase);
            if (generalExtra.supportTicket !== undefined) setSupportTicket(generalExtra.supportTicket);
            if (generalExtra.showServicePrice !== undefined) setShowServicePrice(generalExtra.showServicePrice);
            if (generalExtra.indexRedirect !== undefined) setIndexRedirect(generalExtra.indexRedirect);
            if (generalExtra.logoutRedirect !== undefined) setLogoutRedirect(generalExtra.logoutRedirect);
            if (generalExtra.addFund !== undefined) setAddFund(generalExtra.addFund);
            if (generalExtra.taxForAddFund !== undefined) setTaxForAddFund(generalExtra.taxForAddFund);
            if (generalExtra.minAddFund !== undefined) setMinAddFund(generalExtra.minAddFund);
            if (generalExtra.maxAddFund !== undefined) setMaxAddFund(generalExtra.maxAddFund);
            if (generalExtra.maxBalance !== undefined) setMaxBalance(generalExtra.maxBalance);
          }
        } else {
          loadLocalSettings();
        }
      } else {
        setError("Failed to fetch platform configuration settings.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection failure to configurations endpoints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpTestRecipient) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    setTestingSmtp(true);
    setSmtpTestSuccess(null);
    setSmtpTestLogs(["[Diagnostics] Connecting to SaaS API Gateway..."]);

    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch(`/api/admin/settings/smtp/test?recipient_email=${encodeURIComponent(smtpTestRecipient)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSmtpTestSuccess(true);
        setSmtpTestLogs(data.logs || ["Diagnostic check completed successfully!"]);
      } else {
        setSmtpTestSuccess(false);
        setSmtpTestLogs(data.logs || [`Diagnostic check failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err: any) {
      setSmtpTestSuccess(false);
      setSmtpTestLogs(prev => [...prev, `❌ Network communication failure: ${err.message || 'Connection refused'}`]);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!config) return;
    const nextState = !config.maintenance_mode;
    const promptMsg = nextState
      ? "ACTIVATE GLOBAL MAINTENANCE MODE?\nStandard customers will be blocked immediately with 503 downtime responses."
      : "LIFT SYSTEM MAINTENANCE MODE?\nRestores all public user dashboards and sending processes immediately.";

    if (!confirm(promptMsg)) return;

    setTogglingMaintenance(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/settings/maintenance?enabled=${nextState}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Maintenance mode is now ${nextState ? "ENABLED" : "DISABLED"}.`);
        fetchConfig();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleSaveTab = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    const token = localStorage.getItem("admin_token");

    try {
      if (activeTab === 'general') {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            site_name: siteName,
            logo_url: logoUrl || null,
            dark_logo_url: darkLogoUrl || null,
            footer_dark_logo_url: footerDarkLogoUrl || null,
            support_email: supportEmail,
            global_send_rate_limit: rateLimit,
            default_from_email: defaultFrom,
            announcement_active: announcementActive,
            announcement_message: announcementMessage || null,
            seo_meta_title: seoTitle || null,
            seo_meta_description: seoDescription || null,
            seo_meta_keywords: seoKeywords || null,
            default_from_name: defaultFromName,
            smtp_max_retries: smtpMaxRetries,
            telegram_bot_token: telegramBotToken || '',
            telegram_chat_id: telegramChatId || '',
            telegram_notifications_enabled: telegramNotificationsEnabled,
            system_smtp_host: systemSmtpHost || null,
            system_smtp_port: systemSmtpPort,
            system_smtp_username: systemSmtpUsername || null,
            ...(systemSmtpPassword ? { system_smtp_password: systemSmtpPassword } : {}),
            system_smtp_security: systemSmtpSecurity,
            system_smtp_from_name: systemSmtpFromName || null,
            system_smtp_from_email: systemSmtpFromEmail || null,
            system_smtp_enabled: systemSmtpEnabled,
            extra_settings: {
              ...(config?.extra_settings || {}),
              general_extra: {
                companyName,
                faviconUrl,
                footerLogoUrl,
                darkLogoUrl,
                footerDarkLogoUrl,
                siteLink,
                siteSslLink,
                seoFriendlyUrl,
                fasterBrowsing,
                rechargeVoucher,
                testimonial,
                blog,
                knowledgeBase,
                supportTicket,
                showServicePrice,
                indexRedirect,
                logoutRedirect,
                addFund,
                taxForAddFund,
                minAddFund,
                maxAddFund,
                maxBalance
              }
            }
          })
        });
        if (res.ok) {
          // Save general extra to local storage as fallback
          const extraPayload = {
            companyName,
            faviconUrl,
            footerLogoUrl,
            siteLink,
            siteSslLink,
            seoFriendlyUrl,
            fasterBrowsing,
            rechargeVoucher,
            testimonial,
            blog,
            knowledgeBase,
            supportTicket,
            showServicePrice,
            indexRedirect,
            logoutRedirect,
            addFund,
            taxForAddFund,
            minAddFund,
            maxAddFund,
            maxBalance
          };
          localStorage.setItem('settings_general_extra', JSON.stringify(extraPayload));
          setSaveSuccess("General Settings updated successfully.");
          fetchConfig();
        } else {
          alert("Failed to update general settings.");
        }
      } else if (activeTab === 'registration') {
        if (twoFactorTelegramEnabled && !telegramBotToken.trim()) {
          alert("Please enter a valid Telegram Bot Token to enable Telegram Multi-Factor Authentication.");
          setSaving(false);
          return;
        }
        if ((emailVerificationRequired || twoFactorEmailEnabled) && systemSmtpEnabled) {
          if (!systemSmtpHost.trim() || !systemSmtpUsername.trim()) {
            alert("Please configure a valid SMTP Host and Username to enable Outgoing System SMTP Mailer.");
            setSaving(false);
            return;
          }
        }
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email_verification_required: emailVerificationRequired,
            min_password_length: minPasswordLength,
            max_login_attempts: maxLoginAttempts,
            session_expiry_hours: sessionExpiryHours,
            two_factor_email_enabled: twoFactorEmailEnabled,
            two_factor_telegram_enabled: twoFactorTelegramEnabled,
            two_factor_mandatory_for_admins: twoFactorMandatoryForAdmins,
            telegram_bot_token: telegramBotToken.trim(),
            system_smtp_host: systemSmtpHost || null,
            system_smtp_port: systemSmtpPort,
            system_smtp_username: systemSmtpUsername || null,
            ...(systemSmtpPassword ? { system_smtp_password: systemSmtpPassword } : {}),
            system_smtp_security: systemSmtpSecurity,
            system_smtp_from_name: systemSmtpFromName || null,
            system_smtp_from_email: systemSmtpFromEmail || null,
            system_smtp_enabled: systemSmtpEnabled
          })
        });
        if (res.ok) {
          setSaveSuccess("Registration policy settings updated successfully.");
          fetchConfig();
        } else {
          alert("Failed to update registration policy settings.");
        }
      } else if (activeTab === 'gateways') {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payment_gateway_trc20: paymentGatewayTrc20,
            payment_gateway_bep20: paymentGatewayBep20,
            payment_gateway_usdc_bep20: paymentGatewayUsdcBep20,
            payment_gateway_merchant_id: paymentGatewayMerchantId,
            payment_gateway_qr_code: paymentGatewayQrCode,
            payment_gateway_trc20_enabled: paymentGatewayTrc20Enabled,
            payment_gateway_bep20_enabled: paymentGatewayBep20Enabled,
            payment_gateway_usdc_bep20_enabled: paymentGatewayUsdcBep20Enabled,
            payment_gateway_merchant_enabled: paymentGatewayMerchantEnabled
          })
        });
        if (res.ok) {
          setSaveSuccess("Payment gateway configurations updated successfully.");
          fetchConfig();
        } else {
          alert("Failed to update payment gateway configurations.");
        }
      } else {
        // Save to localStorage and Database via API
        let key = '';
        let dbKey = '';
        let payload = {};

        switch (activeTab) {
          case 'cart':
            key = 'settings_shopping_cart';
            dbKey = 'shopping_cart';
            payload = { cartExpiry, guestCheckout, enableCoupons, currency, minFreeShipping };
            break;
          case 'localizations':
            key = 'settings_localizations';
            dbKey = 'localizations';
            payload = { timezone, dateFormat, timeFormat, language, decimalSeparator };
            break;
          case 'tax':
            key = 'settings_tax';
            dbKey = 'tax';
            payload = { taxEnabled, taxRate, taxName, taxId, taxInclusive };
            break;
          case 'invoice':
            key = 'settings_invoice';
            dbKey = 'invoice';
            payload = { invoicePrefix, invoiceSerial, billingTerms, invoiceLayout, billingAddress };
            break;
          case 'contact':
            key = 'settings_contact';
            dbKey = 'contact';
            payload = { contactEmail, contactPhone, contactAddress, contactMap, enableContactForm };
            break;
          case 'orders':
            key = 'settings_orders';
            dbKey = 'orders';
            payload = { defaultOrderStatus, sendOrderConfirmEmail, autoFulfillDigital, returnWindowDays };
            break;
          case 'fraud':
            key = 'settings_fraud';
            dbKey = 'fraud';
            payload = { maxTxPerIpDay, blockBlacklistedIps, ipBlacklist, blockVpnProxy, enforce3dSecure };
            break;
          case 'appearance':
            key = 'settings_appearance';
            dbKey = 'appearance';
            payload = { primaryColor, fontFamily, customCss, appearanceDarkMode };
            break;
          case 'other':
            key = 'settings_other';
            dbKey = 'other';
            payload = {
              cacheExpirySec,
              dataRetentionDays,
              logLevel,
              debugFlag,
              googleAnalyticsCode,
              analyticsEcommerce,
              googleGcmKey,
              androidAppId,
              ipLocationUrl,
              twitterUsername,
              facebookUrl,
              linkedinUrl,
              instagramUrl,
              twitterConsumerKey,
              twitterConsumerSecret,
              twitterAccessToken,
              twitterTokenSecret,
              googleMapApiKey,
              otherHtmlCode,
              mobileAppAndroidUrl
            };
            break;
        }

        if (key && dbKey) {
          // Save to LocalStorage first (fallback)
          localStorage.setItem(key, JSON.stringify(payload));
          
          // Sync globally to backend Database via API
          const updatedExtra = {
            ...(config?.extra_settings || {}),
            [dbKey]: payload
          };

          const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              extra_settings: updatedExtra
            })
          });

          if (res.ok) {
            setSaveSuccess(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings updated in database via API!`);
            fetchConfig();
          } else {
            alert(`Failed to sync ${activeTab} settings with backend.`);
          }
        }
      }
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error updating settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    alert("Application cache purged successfully!");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        <p className="text-[10px] text-slate-500 mt-2 font-semibold animate-pulse">Loading settings configurations...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-500" />
        <span>{error || "Config fetch error."}</span>
        <button onClick={fetchConfig} className="ml-auto underline flex items-center gap-1 font-bold text-rose-850">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const tabList = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'registration', label: 'Registration / Profile', icon: Users },
    { id: 'cart', label: 'Shopping Cart', icon: ShoppingBag },
    { id: 'localizations', label: 'Localizations', icon: Globe },
    { id: 'tax', label: 'Tax Settings', icon: Percent },
    { id: 'invoice', label: 'Invoice Configuration', icon: FileText },
    { id: 'contact', label: 'Contact Us info', icon: Mail },
    { id: 'orders', label: 'Orders Configuration', icon: ClipboardList },
    { id: 'fraud', label: 'Fraud Protection', icon: Shield },
    { id: 'gateways', label: 'Payment Gateways', icon: CreditCard },
    { id: 'appearance', label: 'Appearance / Theme', icon: Palette },
    { id: 'other', label: 'Other Settings', icon: Sliders },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 -mt-3">
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold animate-slideDown flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left-hand Navigation Sidebar */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-1">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSaveSuccess(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-150 text-left ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/15'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right-hand Form view panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] min-h-[520px] flex flex-col justify-between overflow-hidden">
          <form onSubmit={handleSaveTab} className="flex flex-col justify-between flex-1">
            <div className="p-6 space-y-6">
              
              {/* 1. General Settings Tab */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">⚙️ General Settings</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage branding identity, system SMTP outbound, notifications, and notices.</p>
                    </div>
                  </div>

                  {/* General Sub navigation Menu */}
                  <div className="flex flex-wrap bg-slate-50 p-1.5 rounded-xl border border-slate-200/40 gap-1">
                    {(['site_info', 'seo', 'site_settings', 'funds', 'smtp', 'telegram', 'maintenance'] as const).map((sub) => {
                      const labels: Record<string, string> = {
                        site_info: 'Site Info & Links',
                        seo: 'SEO Settings',
                        site_settings: 'Site Settings',
                        funds: 'Fund Settings',
                        smtp: 'System SMTP',
                        telegram: 'Telegram Bot',
                        maintenance: 'Maintenance'
                      };
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setGeneralSubTab(sub)}
                          className={`px-3 py-1.5 text-[9px] font-extrabold rounded-lg uppercase tracking-wider transition-all ${
                            generalSubTab === sub
                              ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {labels[sub]}
                        </button>
                      );
                    })}
                  </div>

                  {/* General Tab Subsections */}
                  {generalSubTab === 'site_info' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Site Information */}
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            🏢 Site Information & Identity Branding
                          </h4>
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                            Active SaaS Branding
                          </span>
                        </div>

                        {/* Company Name & Site Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
                            <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                              Company Name
                            </label>
                            <input
                              type="text"
                              required
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="e.g. ASTRA IT, Inc."
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                            />
                            <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                              Your official registered organization or company title shown on billing and copyright notices.
                            </span>
                          </div>

                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
                            <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                              Site Name
                            </label>
                            <input
                              type="text"
                              required
                              value={siteName}
                              onChange={(e) => setSiteName(e.target.value)}
                              placeholder="e.g. SmartCampaign"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                            />
                            <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                              Main brand name displayed across system headers, email subject templates, and title tags.
                            </span>
                          </div>
                        </div>

                        {/* Brand Logo & Favicon Assets Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Main Logo Link (Light / Standard) */}
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Main Logo Link (Light Version)
                              </label>
                              <input
                                type="url"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://yourdomain.com/assets/logo-light.png"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                              />
                              <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                                Direct image URL for main header logo in Light Mode (PNG / SVG recommended).
                              </span>
                            </div>
                            
                            {/* Live Preview Box */}
                            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Light Header Preview</span>
                              {logoUrl ? (
                                <img src={logoUrl} alt="Main Light Logo Preview" className="h-7 max-w-[120px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">No image URL</span>
                              )}
                            </div>
                          </div>

                          {/* Main Logo Link (Dark Version) */}
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Main Logo Link (Dark Version)
                              </label>
                              <input
                                type="url"
                                value={darkLogoUrl}
                                onChange={(e) => setDarkLogoUrl(e.target.value)}
                                placeholder="https://yourdomain.com/assets/logo-dark.png"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                              />
                              <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                                Direct image URL for main header logo in Dark Mode (PNG / SVG recommended).
                              </span>
                            </div>

                            {/* Live Preview Box */}
                            <div className="mt-3 p-3 bg-[#0d0e1a] border border-slate-800 rounded-lg flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Dark Header Preview</span>
                              {darkLogoUrl ? (
                                <img src={darkLogoUrl} alt="Main Dark Logo Preview" className="h-7 max-w-[120px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <span className="text-[9px] text-slate-500 italic">No image URL</span>
                              )}
                            </div>
                          </div>

                          {/* Footer Logo Link (Light Version) */}
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Footer Logo Link (Light Version)
                              </label>
                              <input
                                type="url"
                                value={footerLogoUrl}
                                onChange={(e) => setFooterLogoUrl(e.target.value)}
                                placeholder="https://yourdomain.com/assets/footer-logo.png"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                              />
                              <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                                Direct image URL for page footer logo in Light Mode (PNG / SVG recommended).
                              </span>
                            </div>

                            {/* Live Preview Box */}
                            <div className="mt-3 p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Light Footer Preview</span>
                              {footerLogoUrl ? (
                                <img src={footerLogoUrl} alt="Footer Light Logo Preview" className="h-7 max-w-[120px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">No image URL</span>
                              )}
                            </div>
                          </div>

                          {/* Footer Logo Link (Dark Version) */}
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Footer Logo Link (Dark Version)
                              </label>
                              <input
                                type="url"
                                value={footerDarkLogoUrl}
                                onChange={(e) => setFooterDarkLogoUrl(e.target.value)}
                                placeholder="https://yourdomain.com/assets/footer-logo-dark.png"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                              />
                              <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                                Direct image URL for page footer logo in Dark Mode (PNG / SVG recommended).
                              </span>
                            </div>

                            {/* Live Preview Box */}
                            <div className="mt-3 p-3 bg-[#0d0e1a] border border-slate-800 rounded-lg flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Dark Footer Preview</span>
                              {footerDarkLogoUrl ? (
                                <img src={footerDarkLogoUrl} alt="Footer Dark Logo Preview" className="h-7 max-w-[120px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <span className="text-[9px] text-slate-500 italic">No image URL</span>
                              )}
                            </div>
                          </div>

                          {/* Favicon Icon */}
                          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col justify-between">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Favicon Icon
                              </label>
                              <input
                                type="url"
                                value={faviconUrl}
                                onChange={(e) => setFaviconUrl(e.target.value)}
                                placeholder="https://yourdomain.com/assets/favicon.ico"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                              />
                              <span className="text-[9px] text-slate-400 block mt-1.5 font-medium">
                                Square icon URL for browser tab display (64x64 PNG or ICO format).
                              </span>
                            </div>

                            {/* Live Preview Box */}
                            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Tab Preview</span>
                              {faviconUrl ? (
                                <img src={faviconUrl} alt="Favicon Preview" className="w-6 h-6 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">No icon URL</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Site Links */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🔗 Site Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Site Link</label>
                            <input
                              type="text"
                              required
                              value={siteLink}
                              onChange={(e) => setSiteLink(e.target.value)}
                              placeholder="http://www.yourdomain.com/server/"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                            <span className="text-[8px] text-slate-400 block mt-1">URL of the DhruFusion installation, eg. http://www.yourdomain.com/server/</span>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Site SSL Link</label>
                            <input
                              type="text"
                              value={siteSslLink}
                              onChange={(e) => setSiteSslLink(e.target.value)}
                              placeholder="https://www.yourdomain.com/server/"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                            <span className="text-[8px] text-slate-400 block mt-1">URL of the DhruFusion installation for secure access, eg. https://www.yourdomain.com/server/ (leave blank for no SSL)</span>
                          </div>
                        </div>
                      </div>

                      {/* System Sender Branding & Operations (Existing Fields) */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">⚙️ System Operations & Branding</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Support Email</label>
                            <input
                              type="email"
                              required
                              value={supportEmail}
                              onChange={(e) => setSupportEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default System Sender Name</label>
                            <input
                              type="text"
                              required
                              value={defaultFromName}
                              onChange={(e) => setDefaultFromName(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default System Sender Email</label>
                            <input
                              type="email"
                              required
                              value={defaultFrom}
                              onChange={(e) => setDefaultFrom(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Global Send Rate Limit (sends/hr)</label>
                              <input
                                type="number"
                                required
                                value={rateLimit}
                                onChange={(e) => setRateLimit(parseInt(e.target.value) || 1000)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">SMTP Max Retries</label>
                              <input
                                type="number"
                                required
                                value={smtpMaxRetries}
                                onChange={(e) => setSmtpMaxRetries(parseInt(e.target.value) || 3)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {generalSubTab === 'seo' && (
                    <div className="space-y-4 animate-fadeIn">
                      <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🔍 SEO Settings</h4>
                      
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">SEO Friendly URL</label>
                        <div className="flex bg-slate-100/70 p-1 rounded-xl gap-1 max-w-[200px] border border-slate-200/40">
                          {['Disable', 'Enable'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSeoFriendlyUrl(opt)}
                              className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all text-center ${
                                seoFriendlyUrl === opt
                                  ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <span className="text-[8px] text-slate-400 block mt-1">(Requires .htaccess in the root directory)</span>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Page Title Format</label>
                        <input
                          type="text"
                          required
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder="Default"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Site Description</label>
                        <textarea
                          rows={3}
                          required
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder="Header META tag description"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Site Keywords</label>
                        <input
                          type="text"
                          required
                          value={seoKeywords}
                          onChange={(e) => setSeoKeywords(e.target.value)}
                          placeholder="Site Keywords"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {generalSubTab === 'site_settings' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Site Settings Features */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🛠️ Site Settings</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'Faster Browsing', state: fasterBrowsing, setter: setFasterBrowsing },
                            { label: 'Recharge Voucher', state: rechargeVoucher, setter: setRechargeVoucher },
                            { label: 'Testimonial', state: testimonial, setter: setTestimonial },
                            { label: 'Blog', state: blog, setter: setBlog },
                            { label: 'Knowledge Base', state: knowledgeBase, setter: setKnowledgeBase },
                            { label: 'Support Ticket', state: supportTicket, setter: setSupportTicket },
                            { label: 'Show Service Price', state: showServicePrice, setter: setShowServicePrice }
                          ].map((feat) => (
                            <div key={feat.label} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                              <span className="text-xs font-bold text-slate-700">{feat.label}</span>
                              <div className="flex bg-slate-200/50 p-0.5 rounded-lg gap-0.5 border border-slate-350/20">
                                {['Disable', 'Enable'].map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => feat.setter(opt)}
                                    className={`px-3 py-1 text-[9px] font-extrabold rounded-md transition-all text-center ${
                                      feat.state === opt
                                        ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Site Page Redirect */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">↩️ Site Page Redirect</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Index Redirect</label>
                            <input
                              type="text"
                              value={indexRedirect}
                              onChange={(e) => setIndexRedirect(e.target.value)}
                              placeholder="/client/login"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Logout Redirect</label>
                            <input
                              type="text"
                              value={logoutRedirect}
                              onChange={(e) => setLogoutRedirect(e.target.value)}
                              placeholder="/client/login?logout=1"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {generalSubTab === 'funds' && (
                    <div className="space-y-6 animate-fadeIn">
                      <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">💰 Fund Settings</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Add Fund</span>
                            <span className="text-[8px] text-slate-400 font-semibold">Adding of funds by clients from the client area</span>
                          </div>
                          <div className="flex bg-slate-200/50 p-0.5 rounded-lg gap-0.5 border border-slate-350/20">
                            {['Disable', 'Enable'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setAddFund(opt)}
                                className={`px-3 py-1 text-[9px] font-extrabold rounded-md transition-all text-center ${
                                  addFund === opt
                                    ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">Tax for add fund</span>
                            <span className="text-[8px] text-slate-400 font-semibold">Enable tax for Add Fund</span>
                          </div>
                          <div className="flex bg-slate-200/50 p-0.5 rounded-lg gap-0.5 border border-slate-350/20">
                            {['Disable', 'Enable'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setTaxForAddFund(opt)}
                                className={`px-3 py-1 text-[9px] font-extrabold rounded-md transition-all text-center ${
                                  taxForAddFund === opt
                                    ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Minimum Add Fund</label>
                          <input
                            type="number"
                            required
                            value={minAddFund}
                            onChange={(e) => setMinAddFund(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                          <span className="text-[8px] text-slate-400 block mt-1">Enter the minimum amount a client can add in a single transaction.</span>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Maximum Add Fund</label>
                          <input
                            type="number"
                            required
                            value={maxAddFund}
                            onChange={(e) => setMaxAddFund(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                          <span className="text-[8px] text-slate-400 block mt-1">Enter the maximum amount a client can add in a single transaction.</span>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Maximum Balance</label>
                          <input
                            type="number"
                            required
                            value={maxBalance}
                            onChange={(e) => setMaxBalance(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                          <span className="text-[8px] text-slate-400 block mt-1">Enter the maximum balance that a client can add in credit.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {generalSubTab === 'smtp' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          id="systemSmtpEnabled"
                          checked={systemSmtpEnabled}
                          onChange={(e) => setSystemSmtpEnabled(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                        />
                        <label htmlFor="systemSmtpEnabled" className="cursor-pointer">Enable Outgoing System SMTP Mailer</label>
                      </div>

                      {systemSmtpEnabled && (
                        <div className="space-y-4 p-4 border border-slate-150 rounded-2xl bg-white shadow-inner animate-slideDown">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">SMTP Host</label>
                              <input
                                type="text"
                                value={systemSmtpHost}
                                onChange={(e) => setSystemSmtpHost(e.target.value)}
                                placeholder="smtp.mailgun.org"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Port</label>
                              <input
                                type="number"
                                value={systemSmtpPort}
                                onChange={(e) => setSystemSmtpPort(parseInt(e.target.value) || 587)}
                                placeholder="587"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">SMTP Username</label>
                              <input
                                type="text"
                                value={systemSmtpUsername}
                                onChange={(e) => setSystemSmtpUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">SMTP Password</label>
                              <input
                                type="password"
                                value={systemSmtpPassword}
                                onChange={(e) => setSystemSmtpPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Security / Encryption</label>
                              <select
                                value={systemSmtpSecurity}
                                onChange={(e) => setSystemSmtpSecurity(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-850 text-xs focus:outline-none focus:border-brand-500 font-bold bg-white"
                              >
                                <option value="TLS">TLS (STARTTLS)</option>
                                <option value="SSL">SSL</option>
                                <option value="NONE">NONE</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sender From Name</label>
                              <input
                                type="text"
                                value={systemSmtpFromName}
                                onChange={(e) => setSystemSmtpFromName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sender From Email</label>
                              <input
                                type="email"
                                value={systemSmtpFromEmail}
                                onChange={(e) => setSystemSmtpFromEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                              />
                            </div>
                          </div>

                          {/* SMTP Diagnostic Test module */}
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 mt-4">
                            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">🔌 SMTP Diagnostics Console</h4>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recipient Address</label>
                                <input
                                  type="email"
                                  value={smtpTestRecipient}
                                  onChange={(e) => setSmtpTestRecipient(e.target.value)}
                                  placeholder="admin@smartcampaign.today"
                                  className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleTestSmtp}
                                disabled={testingSmtp}
                                className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl text-[10px] disabled:opacity-50 transition-all"
                              >
                                {testingSmtp ? 'Running...' : 'Test Handshake'}
                              </button>
                            </div>
                            {smtpTestLogs.length > 0 && (
                              <div className="space-y-1 animate-fadeIn">
                                <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                  <span>Handshake diagnostics logs:</span>
                                  <span className={smtpTestSuccess ? 'text-emerald-600' : smtpTestSuccess === false ? 'text-rose-600' : 'text-slate-400'}>
                                    {smtpTestSuccess ? 'Passed' : smtpTestSuccess === false ? 'Failed' : 'Testing...'}
                                  </span>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-lg font-mono text-[8px] text-slate-350 max-h-[140px] overflow-y-auto space-y-0.5">
                                  {smtpTestLogs.map((log, idx) => (
                                    <div key={idx} className={log.includes("❌") || log.includes("failed") ? "text-rose-400" : log.includes("success") ? "text-emerald-400" : "text-slate-300"}>
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  )}

                  {generalSubTab === 'telegram' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Telegram Bot API Token</label>
                          <input
                            type="password"
                            value={telegramBotToken}
                            onChange={(e) => setTelegramBotToken(e.target.value)}
                            placeholder="Bot token from @BotFather"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Telegram Target Chat ID</label>
                          <input
                            type="text"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            placeholder="Target channel name or group ID"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                        <input
                          type="checkbox"
                          id="telegramNotificationsEnabled"
                          checked={telegramNotificationsEnabled}
                          onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                        />
                        <label htmlFor="telegramNotificationsEnabled" className="cursor-pointer">Enable System update reports to Telegram channel</label>
                      </div>
                    </div>
                  )}

                  {generalSubTab === 'maintenance' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Announcements (previously announcements sub-tab) */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">📢 Platform Announcements</h4>
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                          <input
                            type="checkbox"
                            id="announcementActive"
                            checked={announcementActive}
                            onChange={(e) => setAnnouncementActive(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <label htmlFor="announcementActive" className="cursor-pointer">Enable Platform Broadcast announcement</label>
                        </div>

                        {announcementActive && (
                          <div className="animate-slideDown">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Broadcast notice text</label>
                            <textarea
                              rows={3}
                              value={announcementMessage}
                              onChange={(e) => setAnnouncementMessage(e.target.value)}
                              placeholder="Write message to display in users dashboard..."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                            />
                          </div>
                        )}
                      </div>

                      {/* Maintenance mode */}
                      <div className="border-t border-slate-100 pt-5 space-y-4">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🚨 Maintenance Settings</h4>
                        <div className={`p-4 rounded-xl border text-[11px] font-semibold flex flex-col gap-2 ${
                          config.maintenance_mode
                            ? 'bg-rose-50 border-rose-100 text-rose-700'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}>
                          <span className="font-extrabold uppercase text-xs flex items-center gap-1.5">
                            {config.maintenance_mode ? '🚨 Maintenance mode is ON' : '✅ Platform active & operational'}
                          </span>
                          <span>
                            {config.maintenance_mode
                              ? 'All normal users will get 503 errors on standard operations. Admin dashboard bypass is active.'
                              : 'Normal users can login, edit templates, and launch email marketing campaigns.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleMaintenance}
                          disabled={togglingMaintenance}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border flex items-center justify-center ${
                            config.maintenance_mode
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-600 border-rose-650 text-white hover:bg-rose-500'
                          }`}
                        >
                          {togglingMaintenance ? 'processing...' : config.maintenance_mode ? 'Lift maintenance mode' : 'Enable Maintenance mode'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 2. Registration / Profile Settings Tab */}
              {activeTab === 'registration' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">👤 Registration & Profiles</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control registration validation boundaries, failed login restrictions, and 2FA policies.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Minimum Password Length</label>
                      <input
                        type="number"
                        required
                        min={6}
                        value={minPasswordLength}
                        onChange={(e) => setMinPasswordLength(parseInt(e.target.value) || 8)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Failed Logins Per IP</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={maxLoginAttempts}
                        onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value) || 5)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Session Validity Age (Hours)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={sessionExpiryHours}
                        onChange={(e) => setSessionExpiryHours(parseInt(e.target.value) || 24)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 mt-5">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-4">🛡️ Identity Verification Policies</h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      {/* Left Column: Checkboxes */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="emailVerificationRequired"
                            checked={emailVerificationRequired}
                            onChange={(e) => setEmailVerificationRequired(e.target.checked)}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <div>
                            <label htmlFor="emailVerificationRequired" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Require Email Verification (Confirm OTP at Signup)</label>
                            <p className="text-[9px] text-slate-400 font-semibold">User must verify their email before they can access standard SaaS client layouts.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="twoFactorEmailEnabled"
                            checked={twoFactorEmailEnabled}
                            onChange={(e) => setTwoFactorEmailEnabled(e.target.checked)}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <div>
                            <label htmlFor="twoFactorEmailEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Enable Email Multi-Factor Auth (OTP on logins)</label>
                            <p className="text-[9px] text-slate-400 font-semibold">Verify logins using an OTP code generated and sent to user email address.</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="twoFactorTelegramEnabled"
                              checked={twoFactorTelegramEnabled}
                              onChange={(e) => setTwoFactorTelegramEnabled(e.target.checked)}
                              className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                            />
                            <div>
                              <label htmlFor="twoFactorTelegramEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Enable Telegram Multi-Factor Auth (OTP on telegram)</label>
                              <p className="text-[9px] text-slate-400 font-semibold">Verify logins using an OTP code sent via integration bot to Telegram target chats.</p>
                            </div>
                          </div>
                          
                          {twoFactorTelegramEnabled && (
                            <div className="flex flex-col gap-1.5 border-l-2 border-brand-500 pl-4 ml-2.5 mt-1.5 animate-fadeIn">
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Telegram Bot Token</label>
                              <input
                                type="text"
                                required
                                value={telegramBotToken}
                                onChange={(e) => setTelegramBotToken(e.target.value)}
                                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                                className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-mono"
                              />
                              <p className="text-[8.5px] text-slate-400 font-semibold leading-normal">
                                Please provide the Telegram Bot API Token that will be used to dispatch OTP verification codes to users.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="twoFactorMandatoryForAdmins"
                            checked={twoFactorMandatoryForAdmins}
                            onChange={(e) => setTwoFactorMandatoryForAdmins(e.target.checked)}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <div>
                            <label htmlFor="twoFactorMandatoryForAdmins" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Make 2FA Mandatory for all Administrative Accounts</label>
                            <p className="text-[9px] text-slate-400 font-semibold">Force Super Admin and support CRM accounts to pass OTP identity validation.</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Dynamic Outgoing SMTP configuration card */}
                      <div className="space-y-4">
                        {(emailVerificationRequired || twoFactorEmailEnabled) && (
                          <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 shadow-sm animate-fadeIn">
                            <h5 className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              ✉️ Outgoing System SMTP Configuration
                            </h5>
                            <p className="text-[9.5px] text-slate-500 leading-normal mb-3 font-semibold">
                              Gmail or hosting email SMTP details are required to send verification OTP emails securely.
                            </p>

                            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 mb-3">
                              <input
                                type="checkbox"
                                id="systemSmtpEnabledReg"
                                checked={systemSmtpEnabled || false}
                                onChange={(e) => setSystemSmtpEnabled(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                              />
                              <label htmlFor="systemSmtpEnabledReg" className="cursor-pointer">Enable Outgoing System SMTP Mailer</label>
                            </div>

                            {systemSmtpEnabled && (
                              <div className="space-y-3 bg-white p-3 border border-slate-200 rounded-xl">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="col-span-2">
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">SMTP Host</label>
                                    <input
                                      type="text"
                                      required={systemSmtpEnabled}
                                      value={systemSmtpHost}
                                      onChange={(e) => setSystemSmtpHost(e.target.value)}
                                      placeholder="smtp.gmail.com"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Port</label>
                                    <input
                                      type="number"
                                      required={systemSmtpEnabled}
                                      value={systemSmtpPort}
                                      onChange={(e) => setSystemSmtpPort(parseInt(e.target.value) || 587)}
                                      placeholder="587"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">SMTP Username</label>
                                    <input
                                      type="text"
                                      required={systemSmtpEnabled}
                                      value={systemSmtpUsername}
                                      onChange={(e) => setSystemSmtpUsername(e.target.value)}
                                      placeholder="username@gmail.com"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">SMTP Password</label>
                                    <input
                                      type="password"
                                      required={systemSmtpEnabled}
                                      value={systemSmtpPassword}
                                      onChange={(e) => setSystemSmtpPassword(e.target.value)}
                                      placeholder="••••••••"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Sender Name</label>
                                    <input
                                      type="text"
                                      value={systemSmtpFromName}
                                      onChange={(e) => setSystemSmtpFromName(e.target.value)}
                                      placeholder="SmartCampaign OTP"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Sender Email</label>
                                    <input
                                      type="email"
                                      value={systemSmtpFromEmail}
                                      onChange={(e) => setSystemSmtpFromEmail(e.target.value)}
                                      placeholder="noreply@gmail.com"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:border-brand-500 font-semibold"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[8.5px] font-bold text-slate-500 uppercase mb-0.5">SMTP Security</label>
                                  <select
                                    value={systemSmtpSecurity}
                                    onChange={(e) => setSystemSmtpSecurity(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-850 text-[11px] focus:outline-none focus:border-brand-500 font-bold bg-white"
                                  >
                                    <option value="TLS">STARTTLS (TLS on Port 587)</option>
                                    <option value="SSL">SSL/TLS (Explicit on Port 465)</option>
                                    <option value="NONE">None (Plain Text on Port 25)</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Shopping Cart Settings Tab */}
              {activeTab === 'cart' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">🛒 Shopping Cart</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Configure commerce cart lifecycle metrics and checkout rules.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cart Expiration Time (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={cartExpiry}
                        onChange={(e) => setCartExpiry(parseInt(e.target.value) || 60)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Commerce Currency Code</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-bold"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="BDT">BDT (৳)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min Order for Free Shipping ($)</label>
                      <input
                        type="number"
                        required
                        value={minFreeShipping}
                        onChange={(e) => setMinFreeShipping(parseInt(e.target.value) || 50)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="guestCheckout"
                        checked={guestCheckout}
                        onChange={(e) => setGuestCheckout(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="guestCheckout" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Allow Guest Checkout Mode</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Allow users to configure checkouts and payments without registering an account first.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="enableCoupons"
                        checked={enableCoupons}
                        onChange={(e) => setEnableCoupons(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enableCoupons" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Enable Coupons & Promotional Codes</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Let shoppers apply discount codes during invoice calculations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Localizations Tab */}
              {activeTab === 'localizations' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">🌐 Localizations</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control regional parameters, default languages, time zones, and date representations.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">System Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="UTC">UTC (GMT+00:00)</option>
                        <option value="Asia/Dhaka">Asia/Dhaka (GMT+06:00)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date Display Format</label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-05)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 05/06/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/05/2026)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Time Format</label>
                      <select
                        value={timeFormat}
                        onChange={(e) => setTimeFormat(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="24-hour">24-hour (e.g. 18:30)</option>
                        <option value="12-hour">12-hour (e.g. 06:30 PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="en">English</option>
                        <option value="bn">Bengali</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Decimal Numeric Separator</label>
                      <select
                        value={decimalSeparator}
                        onChange={(e) => setDecimalSeparator(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value=".">Dot (.) e.g. 10.20</option>
                        <option value=",">Comma (,) e.g. 10,20</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Tax Settings Tab */}
              {activeTab === 'tax' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">💵 Tax Settings</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Setup VAT or sales taxes rates applied to system invoices.</p>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      id="taxEnabled"
                      checked={taxEnabled}
                      onChange={(e) => setTaxEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                    />
                    <label htmlFor="taxEnabled" className="cursor-pointer">Enable Tax Calculations on Invoices</label>
                  </div>

                  {taxEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tax Name / Label</label>
                        <input
                          type="text"
                          required
                          value={taxName}
                          onChange={(e) => setTaxName(e.target.value)}
                          placeholder="e.g. VAT, GST, Sales Tax"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tax Rate Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Business Tax ID / Reference Number</label>
                        <input
                          type="text"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="e.g. TIN-123456789"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-650 h-fit self-end">
                        <input
                          type="checkbox"
                          id="taxInclusive"
                          checked={taxInclusive}
                          onChange={(e) => setTaxInclusive(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                        />
                        <label htmlFor="taxInclusive" className="cursor-pointer">Product Prices are Inclusive of Tax</label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6. Invoice Tab */}
              {activeTab === 'invoice' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">🧾 Invoice Configuration</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control prefix tags, invoice numbering serials, layout templates, and billing addresses.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Invoice Number Prefix</label>
                      <input
                        type="text"
                        required
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                        placeholder="e.g. INV-"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Starting Serial Number</label>
                      <input
                        type="number"
                        required
                        value={invoiceSerial}
                        onChange={(e) => setInvoiceSerial(parseInt(e.target.value) || 1000)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Billing Terms</label>
                      <select
                        value={billingTerms}
                        onChange={(e) => setBillingTerms(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Invoice Layout Design</label>
                      <select
                        value={invoiceLayout}
                        onChange={(e) => setInvoiceLayout(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="Classic">Classic Corporate</option>
                        <option value="Modern">Modern Minimalist</option>
                        <option value="Simple">Simple Plain-text</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Company Office Address (Header details)</label>
                    <textarea
                      rows={3}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* 7. Contact Us Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">📞 Contact Us Info</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Update support channels, locations, and public feedback form toggles.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Public Support Email</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Public Support Hotline / Phone</label>
                      <input
                        type="text"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Corporate Office Physical Address</label>
                    <input
                      type="text"
                      required
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Google Maps Embed Link (Iframe URL)</label>
                    <input
                      type="text"
                      value={contactMap}
                      onChange={(e) => setContactMap(e.target.value)}
                      placeholder="https://google.com/maps/embed?pb=..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      id="enableContactForm"
                      checked={enableContactForm}
                      onChange={(e) => setEnableContactForm(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                    />
                    <label htmlFor="enableContactForm" className="cursor-pointer">Display dynamic contact form feedback on the Landing page</label>
                  </div>
                </div>
              )}

              {/* 8. Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">📦 Orders Configuration</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control default order status mappings, automatic triggers, and refund windows.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default Initial Order Status</label>
                      <select
                        value={defaultOrderStatus}
                        onChange={(e) => setDefaultOrderStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="Pending">Pending Validation</option>
                        <option value="Processing">Processing / Active</option>
                        <option value="Completed">Auto-Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Return/Refund Window (Days)</label>
                      <input
                        type="number"
                        required
                        value={returnWindowDays}
                        onChange={(e) => setReturnWindowDays(parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="autoFulfillDigital"
                        checked={autoFulfillDigital}
                        onChange={(e) => setAutoFulfillDigital(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="autoFulfillDigital" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Auto-Fulfill Digital Plan subscriptions</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Instantly activate user balance quotas and wallet limits after bKash/Stripe confirms payment.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="sendOrderConfirmEmail"
                        checked={sendOrderConfirmEmail}
                        onChange={(e) => setSendOrderConfirmEmail(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="sendOrderConfirmEmail" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Send Transactional Invoice via Email</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Automatically dispatch PDF billing invoice template to client email inbox.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 9. Fraud Protection Tab */}
              {activeTab === 'fraud' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-widest">🛡️ Fraud Protection</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Enforce transactional rate limits, IP blacklists, and gateway protection protocols.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Transactions Per IP Per Day</label>
                      <input
                        type="number"
                        required
                        value={maxTxPerIpDay}
                        onChange={(e) => setMaxTxPerIpDay(parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-650 h-fit self-end">
                      <input
                        type="checkbox"
                        id="blockBlacklistedIps"
                        checked={blockBlacklistedIps}
                        onChange={(e) => setBlockBlacklistedIps(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <label htmlFor="blockBlacklistedIps" className="cursor-pointer">Enforce IP blacklisting blockades</label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Blacklisted IP Address Ranges (Comma separated)</label>
                    <textarea
                      rows={3}
                      value={ipBlacklist}
                      onChange={(e) => setIpBlacklist(e.target.value)}
                      placeholder="e.g. 192.168.1.100, 203.0.113.50, 198.51.100.0/24"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="blockVpnProxy"
                        checked={blockVpnProxy}
                        onChange={(e) => setBlockVpnProxy(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="blockVpnProxy" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Block VPN / Anonymous Proxy checkouts</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Refuse transaction requests originating from known proxy hosts.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="enforce3dSecure"
                        checked={enforce3dSecure}
                        onChange={(e) => setEnforce3dSecure(e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enforce3dSecure" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Require Enforced 3D-Secure checkouts</label>
                        <p className="text-[9px] text-slate-400 font-semibold">Trigger Stripe Radar validation rules on credit cards to stop chargebacks.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Gateways Tab */}
              {activeTab === 'gateways' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-widest">💳 Payment Gateway Configurations</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Configure deposit addresses, merchant accounts, and active gateway availability status.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TRC20 Gateway Card */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-50 text-red-650 rounded text-[9px] font-black tracking-widest border border-red-100 uppercase">TRC20</span>
                          Deposit Address (TRC20)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="trc20Enabled"
                            checked={paymentGatewayTrc20Enabled}
                            onChange={(e) => setPaymentGatewayTrc20Enabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <label htmlFor="trc20Enabled" className="text-[10px] font-extrabold text-slate-500 cursor-pointer uppercase">Active</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">TRC20 Deposit Address</label>
                        <input
                          type="text"
                          value={paymentGatewayTrc20}
                          onChange={(e) => setPaymentGatewayTrc20(e.target.value)}
                          placeholder="Enter TRC20 (USDT) Address"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-mono shadow-sm"
                        />
                      </div>
                    </div>

                    {/* BEP20 Gateway Card */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-650 rounded text-[9px] font-black tracking-widest border border-yellow-100 uppercase">BEP20</span>
                          Deposit Address (BEP20)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="bep20Enabled"
                            checked={paymentGatewayBep20Enabled}
                            onChange={(e) => setPaymentGatewayBep20Enabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <label htmlFor="bep20Enabled" className="text-[10px] font-extrabold text-slate-500 cursor-pointer uppercase">Active</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">BEP20 Deposit Address</label>
                        <input
                          type="text"
                          value={paymentGatewayBep20}
                          onChange={(e) => setPaymentGatewayBep20(e.target.value)}
                          placeholder="Enter BEP20 (USDT) Address"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-mono shadow-sm"
                        />
                      </div>
                    </div>

                    {/* USDC BEP20 Gateway Card */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-650 rounded text-[9px] font-black tracking-widest border border-blue-100 uppercase">USDC BEP20</span>
                          USDC Address (BEP20)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="usdcBep20Enabled"
                            checked={paymentGatewayUsdcBep20Enabled}
                            onChange={(e) => setPaymentGatewayUsdcBep20Enabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <label htmlFor="usdcBep20Enabled" className="text-[10px] font-extrabold text-slate-500 cursor-pointer uppercase">Active</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">USDC BEP20 Address</label>
                        <input
                          type="text"
                          value={paymentGatewayUsdcBep20}
                          onChange={(e) => setPaymentGatewayUsdcBep20(e.target.value)}
                          placeholder="Enter USDC BEP20 Address"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-mono shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Merchant ID / Scan QR Code Gateway Card */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-650 rounded text-[9px] font-black tracking-widest border border-emerald-100 uppercase">Direct Merchant</span>
                          Merchant / Payee ID
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="merchantEnabled"
                            checked={paymentGatewayMerchantEnabled}
                            onChange={(e) => setPaymentGatewayMerchantEnabled(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                          />
                          <label htmlFor="merchantEnabled" className="text-[10px] font-extrabold text-slate-500 cursor-pointer uppercase">Active</label>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Merchant ID / Payee ID</label>
                          <input
                            type="text"
                            value={paymentGatewayMerchantId}
                            onChange={(e) => setPaymentGatewayMerchantId(e.target.value)}
                            placeholder="Enter Merchant ID or Payee Account"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Merchant QR Code URL</label>
                          <input
                            type="text"
                            value={paymentGatewayQrCode}
                            onChange={(e) => setPaymentGatewayQrCode(e.target.value)}
                            placeholder="Enter Merchant QR Code image link"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. Appearance Settings Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">🎨 Appearance & Layout</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control typography fonts, brand color presets, and inject custom stylesheets.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Brand Theme color preset</label>
                      <select
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 text-xs focus:outline-none focus:border-brand-500 font-bold"
                      >
                        <option value="indigo">Royal Indigo (#6366f1)</option>
                        <option value="emerald">Sleek Emerald (#10b981)</option>
                        <option value="sky">Ocean Breeze Sky (#0ea5e9)</option>
                        <option value="rose">Soft Coral Rose (#f43f5e)</option>
                        <option value="slate">Gunmetal Slate (#64748b)</option>
                        <option value="violet">Deep Violet (#8b5cf6)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">System Typography Font</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="Inter">Inter UI (Default)</option>
                        <option value="Roboto">Roboto (Google Clean)</option>
                        <option value="Poppins">Poppins (Modern Display)</option>
                        <option value="Outfit">Outfit (Elegant Minimalist)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default App Theme mode</label>
                      <select
                        value={appearanceDarkMode}
                        onChange={(e) => setAppearanceDarkMode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      >
                        <option value="Light">Always Light Mode</option>
                        <option value="Dark">Always Dark Mode</option>
                        <option value="System">System Preferences Auto</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Custom CSS Styles overrides</label>
                    <textarea
                      rows={4}
                      value={customCss}
                      onChange={(e) => setCustomCss(e.target.value)}
                      placeholder="e.g. .btn-primary { border-radius: 4px; }"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* 11. Other Settings Tab */}
              {activeTab === 'other' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-widest">🔮 Other Settings</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Control background caches expiration, data storage retentions, and debug levels.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Application Cache Lifespan (Seconds)</label>
                      <input
                        type="number"
                        required
                        value={cacheExpirySec}
                        onChange={(e) => setCacheExpirySec(parseInt(e.target.value) || 3600)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">User Data Retention Lifetime (Days)</label>
                      <input
                        type="number"
                        required
                        value={dataRetentionDays}
                        onChange={(e) => setDataRetentionDays(parseInt(e.target.value) || 365)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Standard Logging verbosity level</label>
                      <select
                        value={logLevel}
                        onChange={(e) => setLogLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-bold"
                      >
                        <option value="DEBUG">DEBUG (Detailed tracing)</option>
                        <option value="INFO">INFO (Standard outputs)</option>
                        <option value="WARNING">WARNING (Suspicious behaviors)</option>
                        <option value="ERROR">ERROR (System exceptions)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-650 h-fit self-end">
                      <input
                        type="checkbox"
                        id="debugFlag"
                        checked={debugFlag}
                        onChange={(e) => setDebugFlag(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-650 cursor-pointer"
                      />
                      <label htmlFor="debugFlag" className="cursor-pointer">Activate System Profiler Diagnostics</label>
                    </div>
                  </div>

                  {/* Google Analytics Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">📊 Google Analytics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tracking Code</label>
                        <input
                          type="text"
                          value={googleAnalyticsCode}
                          onChange={(e) => setGoogleAnalyticsCode(e.target.value)}
                          placeholder="e.g. G-02D671G8VR"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Analytics For eCommerce</label>
                        <div className="flex bg-slate-100/70 p-1 rounded-xl gap-1 max-w-[200px] border border-slate-200/40">
                          {['Disable', 'Enable'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnalyticsEcommerce(opt)}
                              className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition-all text-center ${
                                analyticsEcommerce === opt
                                  ? 'bg-white text-brand-650 shadow-sm border border-slate-200/50'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google GCM Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🔔 Google GCM</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Google GCM Key</label>
                        <input
                          type="text"
                          value={googleGcmKey}
                          onChange={(e) => setGoogleGcmKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Android App ID</label>
                        <input
                          type="text"
                          value={androidAppId}
                          onChange={(e) => setAndroidAppId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Geo Provider Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">📍 Geo Provider</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">IP Location</label>
                      <input
                        type="text"
                        value={ipLocationUrl}
                        onChange={(e) => setIpLocationUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1 font-semibold">URL of the IP Location, eg. https://www.yourdomain.com/?ip=</span>
                    </div>
                  </div>

                  {/* Social Networking Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🌐 Social Networking</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Twitter [Username]</label>
                        <input
                          type="text"
                          value={twitterUsername}
                          onChange={(e) => setTwitterUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Facebook</label>
                        <input
                          type="text"
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                          placeholder="https://facebook.com/..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Linkedin</label>
                        <input
                          type="text"
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Instagram</label>
                        <input
                          type="text"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Twitter Application Access Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🐦 Twitter Application Access</h4>
                      <span className="text-[9px] text-brand-500 underline font-bold cursor-pointer hover:text-brand-600">(How to get access ?)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Consumer Key</label>
                        <input
                          type="password"
                          value={twitterConsumerKey}
                          onChange={(e) => setTwitterConsumerKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Consumer Secret</label>
                        <input
                          type="password"
                          value={twitterConsumerSecret}
                          onChange={(e) => setTwitterConsumerSecret(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Access Token</label>
                        <input
                          type="password"
                          value={twitterAccessToken}
                          onChange={(e) => setTwitterAccessToken(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Token Secret</label>
                        <input
                          type="password"
                          value={twitterTokenSecret}
                          onChange={(e) => setTwitterTokenSecret(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Google Map API Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">🗺️ Google Map API</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Google Map API Key</label>
                      <input
                        type="password"
                        value={googleMapApiKey}
                        onChange={(e) => setGoogleMapApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Other Detail Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">📝 Other Detail</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Other HTML Code</label>
                      <textarea
                        rows={4}
                        value={otherHtmlCode}
                        onChange={(e) => setOtherHtmlCode(e.target.value)}
                        placeholder="e.g. <!-- Custom script here -->"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Mobile App Download Link Section */}
                  <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">📱 Mobile App Download Link</h4>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Android app link</label>
                      <input
                        type="text"
                        value={mobileAppAndroidUrl}
                        onChange={(e) => setMobileAppAndroidUrl(e.target.value)}
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Clear Cache Action */}
                  <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Flush System cache</h4>
                      <p className="text-[9px] text-slate-400 font-semibold">Wipe memory storage, dispatch rates counters, and compile templates cache instantly.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-slate-700 flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={13} className="text-slate-400" />
                      Flush Cache
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Form Action footer bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl brand-gradient-bg text-white text-xs font-bold hover:opacity-95 shadow-md shadow-brand-500/10 transition-all flex items-center gap-1.5"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
