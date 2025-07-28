import { createError } from '../middleware/errorHandler';

export interface RegionConfig {
  code: string;
  name: string;
  currency: string;
  paymentMethods: string[];
  taxRates: {
    standard: number;
    reduced?: number;
    zero?: number;
  };
  compliance: {
    requiresVAT: boolean;
    requiresBusinessRegistration: boolean;
    maxTransactionAmount?: number;
    kycRequired?: boolean;
    pciDssRequired: boolean;
  };
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  taxType: string;
  breakdown: Array<{
    type: string;
    rate: number;
    amount: number;
  }>;
}

export class ComplianceService {
  // Regional configurations
  private static readonly REGIONS: Record<string, RegionConfig> = {
    // European Union - SEPA
    'EU': {
      code: 'EU',
      name: 'European Union',
      currency: 'EUR',
      paymentMethods: ['card', 'sepa', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 20, // Average EU VAT rate
        reduced: 10,
        zero: 0
      },
      compliance: {
        requiresVAT: true,
        requiresBusinessRegistration: true,
        maxTransactionAmount: 1000000, // €10,000
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // United States - ACH
    'US': {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      paymentMethods: ['card', 'ach', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 8.5, // Average US sales tax
        zero: 0
      },
      compliance: {
        requiresVAT: false,
        requiresBusinessRegistration: false,
        maxTransactionAmount: 1000000, // $10,000 for KYC
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // United Kingdom
    'GB': {
      code: 'GB',
      name: 'United Kingdom',
      currency: 'GBP',
      paymentMethods: ['card', 'faster_payments', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 20,
        reduced: 5,
        zero: 0
      },
      compliance: {
        requiresVAT: true,
        requiresBusinessRegistration: true,
        maxTransactionAmount: 1000000, // £10,000
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // Canada
    'CA': {
      code: 'CA',
      name: 'Canada',
      currency: 'CAD',
      paymentMethods: ['card', 'interac', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 13, // HST average
        reduced: 5, // GST
        zero: 0
      },
      compliance: {
        requiresVAT: true, // GST/HST
        requiresBusinessRegistration: true,
        maxTransactionAmount: 1000000, // CAD $10,000
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // Australia
    'AU': {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      paymentMethods: ['card', 'becs', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 10, // GST
        zero: 0
      },
      compliance: {
        requiresVAT: true, // GST
        requiresBusinessRegistration: true,
        maxTransactionAmount: 1000000, // AUD $10,000
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // Japan
    'JP': {
      code: 'JP',
      name: 'Japan',
      currency: 'JPY',
      paymentMethods: ['card', 'jcb', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 10,
        reduced: 8,
        zero: 0
      },
      compliance: {
        requiresVAT: true, // Consumption tax
        requiresBusinessRegistration: true,
        maxTransactionAmount: 100000000, // ¥1,000,000
        kycRequired: true,
        pciDssRequired: true
      }
    },
    // Singapore
    'SG': {
      code: 'SG',
      name: 'Singapore',
      currency: 'SGD',
      paymentMethods: ['card', 'paynow', 'apple_pay', 'google_pay'],
      taxRates: {
        standard: 7, // GST
        zero: 0
      },
      compliance: {
        requiresVAT: true, // GST
        requiresBusinessRegistration: true,
        maxTransactionAmount: 2000000, // SGD $20,000
        kycRequired: true,
        pciDssRequired: true
      }
    }
  };

  static getRegionConfig(countryCode: string): RegionConfig {
    // Map specific countries to regions
    const countryToRegion: Record<string, string> = {
      'AT': 'EU', 'BE': 'EU', 'BG': 'EU', 'HR': 'EU', 'CY': 'EU',
      'CZ': 'EU', 'DK': 'EU', 'EE': 'EU', 'FI': 'EU', 'FR': 'EU',
      'DE': 'EU', 'GR': 'EU', 'HU': 'EU', 'IE': 'EU', 'IT': 'EU',
      'LV': 'EU', 'LT': 'EU', 'LU': 'EU', 'MT': 'EU', 'NL': 'EU',
      'PL': 'EU', 'PT': 'EU', 'RO': 'EU', 'SK': 'EU', 'SI': 'EU',
      'ES': 'EU', 'SE': 'EU'
    };

    const regionCode = countryToRegion[countryCode.toUpperCase()] || countryCode.toUpperCase();
    
    return this.REGIONS[regionCode] || this.REGIONS['US']; // Default to US
  }

  static calculateTax(
    amount: number,
    countryCode: string,
    productType: 'digital' | 'physical' | 'service' = 'digital',
    customerType: 'business' | 'consumer' = 'consumer'
  ): TaxCalculation {
    const regionConfig = this.getRegionConfig(countryCode);
    let taxRate = 0;
    let taxType = 'Sales Tax';

    // Determine tax rate based on region and product type
    if (regionConfig.compliance.requiresVAT) {
      taxType = regionConfig.code === 'EU' ? 'VAT' : 
                regionConfig.code === 'GB' ? 'VAT' :
                regionConfig.code === 'CA' ? 'GST/HST' :
                regionConfig.code === 'AU' ? 'GST' :
                regionConfig.code === 'JP' ? 'Consumption Tax' :
                regionConfig.code === 'SG' ? 'GST' : 'Tax';

      // Business-to-business transactions may be tax-exempt in some regions
      if (customerType === 'business' && regionConfig.code === 'EU') {
        taxRate = 0; // B2B reverse charge
      } else if (productType === 'digital') {
        taxRate = regionConfig.taxRates.standard;
      } else if (productType === 'physical') {
        taxRate = regionConfig.taxRates.standard;
      } else if (productType === 'service') {
        taxRate = regionConfig.taxRates.reduced || regionConfig.taxRates.standard;
      }
    } else {
      // Non-VAT regions (like US states)
      if (productType === 'digital') {
        // Many US states don't tax digital goods
        taxRate = regionConfig.taxRates.zero || 0;
      } else {
        taxRate = regionConfig.taxRates.standard;
      }
    }

    const subtotal = amount;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      taxRate,
      total,
      taxType,
      breakdown: [
        {
          type: taxType,
          rate: taxRate,
          amount: taxAmount
        }
      ]
    };
  }

  static validatePaymentMethod(paymentMethod: string, countryCode: string): boolean {
    const regionConfig = this.getRegionConfig(countryCode);
    return regionConfig.paymentMethods.includes(paymentMethod);
  }

  static getAvailablePaymentMethods(countryCode: string): string[] {
    const regionConfig = this.getRegionConfig(countryCode);
    return regionConfig.paymentMethods;
  }

  static validateTransactionAmount(amount: number, countryCode: string): {
    isValid: boolean;
    requiresKYC: boolean;
    maxAmount?: number;
    message?: string;
  } {
    const regionConfig = this.getRegionConfig(countryCode);
    
    if (regionConfig.compliance.maxTransactionAmount && 
        amount > regionConfig.compliance.maxTransactionAmount) {
      return {
        isValid: false,
        requiresKYC: true,
        maxAmount: regionConfig.compliance.maxTransactionAmount,
        message: `Amount exceeds maximum allowed (${regionConfig.compliance.maxTransactionAmount / 100}) without KYC verification`
      };
    }

    // Check if KYC is required based on amount
    const requiresKYC = regionConfig.compliance.kycRequired && 
                       regionConfig.compliance.maxTransactionAmount &&
                       amount > (regionConfig.compliance.maxTransactionAmount * 0.5);

    return {
      isValid: true,
      requiresKYC
    };
  }

  static getComplianceRequirements(countryCode: string): {
    vatRequired: boolean;
    businessRegistrationRequired: boolean;
    kycRequired: boolean;
    pciDssRequired: boolean;
    additionalRequirements: string[];
  } {
    const regionConfig = this.getRegionConfig(countryCode);
    const additionalRequirements: string[] = [];

    // Add region-specific requirements
    if (regionConfig.code === 'EU') {
      additionalRequirements.push('GDPR compliance required');
      additionalRequirements.push('Strong Customer Authentication (SCA) for payments > €30');
    }

    if (regionConfig.code === 'US') {
      additionalRequirements.push('State-specific sales tax registration may be required');
    }

    if (regionConfig.code === 'GB') {
      additionalRequirements.push('FCA authorization may be required for payment services');
    }

    return {
      vatRequired: regionConfig.compliance.requiresVAT,
      businessRegistrationRequired: regionConfig.compliance.requiresBusinessRegistration,
      kycRequired: regionConfig.compliance.kycRequired || false,
      pciDssRequired: regionConfig.compliance.pciDssRequired,
      additionalRequirements
    };
  }

  // Validate business information for compliance
  static validateBusinessInfo(businessInfo: {
    name: string;
    registrationNumber?: string;
    vatNumber?: string;
    address: {
      country: string;
      line1: string;
      city: string;
      postalCode: string;
    };
  }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const regionConfig = this.getRegionConfig(businessInfo.address.country);

    // Validate required fields
    if (!businessInfo.name.trim()) {
      errors.push('Business name is required');
    }

    if (regionConfig.compliance.requiresBusinessRegistration && !businessInfo.registrationNumber) {
      errors.push('Business registration number is required for this region');
    }

    if (regionConfig.compliance.requiresVAT && !businessInfo.vatNumber) {
      if (regionConfig.code === 'EU') {
        errors.push('VAT number is required for EU businesses');
      } else {
        warnings.push('VAT/Tax number is recommended for tax reporting');
      }
    }

    // Validate VAT number format (basic validation)
    if (businessInfo.vatNumber) {
      if (regionConfig.code === 'EU' && !this.validateEUVATNumber(businessInfo.vatNumber)) {
        errors.push('Invalid EU VAT number format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static validateEUVATNumber(vatNumber: string): boolean {
    // Basic EU VAT number validation (country code + 8-12 digits)
    const euVatRegex = /^[A-Z]{2}[0-9A-Z]{8,12}$/;
    return euVatRegex.test(vatNumber.replace(/\s/g, '').toUpperCase());
  }

  // Get timezone for a country
  static getTimezone(countryCode: string): string {
    const timezones: Record<string, string> = {
      'US': 'America/New_York',
      'CA': 'America/Toronto',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'IT': 'Europe/Rome',
      'ES': 'Europe/Madrid',
      'NL': 'Europe/Amsterdam',
      'AU': 'Australia/Sydney',
      'JP': 'Asia/Tokyo',
      'SG': 'Asia/Singapore',
      'IN': 'Asia/Kolkata',
      'CN': 'Asia/Shanghai',
      'BR': 'America/Sao_Paulo',
      'MX': 'America/Mexico_City'
    };

    return timezones[countryCode.toUpperCase()] || 'UTC';
  }

  // Convert amount between currencies for regional display
  static async getRegionalDisplayAmount(
    amount: number,
    fromCurrency: string,
    countryCode: string
  ): Promise<{
    amount: number;
    currency: string;
    exchangeRate?: number;
  }> {
    const regionConfig = this.getRegionConfig(countryCode);
    const toCurrency = regionConfig.currency;

    if (fromCurrency === toCurrency) {
      return { amount, currency: toCurrency };
    }

    // This would integrate with the CurrencyService
    // For now, return the original amount
    return { amount, currency: fromCurrency };
  }

  // Check if region requires specific consent forms
  static getRequiredConsents(countryCode: string): string[] {
    const consents: string[] = [];
    const regionConfig = this.getRegionConfig(countryCode);

    if (regionConfig.code === 'EU') {
      consents.push('GDPR data processing consent');
      consents.push('Marketing communications consent (optional)');
    }

    if (regionConfig.code === 'US') {
      consents.push('Terms of service acceptance');
      consents.push('Privacy policy acknowledgment');
    }

    // Universal consents
    consents.push('Payment processing authorization');

    return consents;
  }

  // Generate compliance report for a transaction
  static generateComplianceReport(transaction: {
    amount: number;
    currency: string;
    customerCountry: string;
    paymentMethod: string;
    customerType: 'business' | 'consumer';
  }): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
    taxCalculation: TaxCalculation;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate payment method
    if (!this.validatePaymentMethod(transaction.paymentMethod, transaction.customerCountry)) {
      issues.push(`Payment method ${transaction.paymentMethod} is not supported in ${transaction.customerCountry}`);
    }

    // Validate transaction amount
    const amountValidation = this.validateTransactionAmount(transaction.amount, transaction.customerCountry);
    if (!amountValidation.isValid) {
      issues.push(amountValidation.message || 'Transaction amount validation failed');
    }

    if (amountValidation.requiresKYC) {
      recommendations.push('KYC verification recommended for this transaction amount');
    }

    // Calculate tax
    const taxCalculation = this.calculateTax(
      transaction.amount,
      transaction.customerCountry,
      'digital', // Default to digital
      transaction.customerType
    );

    // Check compliance requirements
    const compliance = this.getComplianceRequirements(transaction.customerCountry);
    if (compliance.vatRequired && taxCalculation.taxAmount === 0 && transaction.customerType === 'consumer') {
      recommendations.push('Tax calculation should be reviewed for consumer transactions');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations,
      taxCalculation
    };
  }
}