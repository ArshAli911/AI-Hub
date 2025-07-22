export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const isValid = re.test(String(email).toLowerCase());
  
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid email address'
  };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.trim().length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  // Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  if (!hasUppercase) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowercase) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
  }

  return { isValid: true };
};

export const validateRequired = (value: string, fieldName: string = 'Field'): ValidationResult => {
  const isValid = Boolean(value && value.trim().length > 0);
  return {
    isValid,
    error: isValid ? undefined : `${fieldName} is required`
  };
};

export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must be less than 15 digits' };
  }

  return { isValid: true };
};

export const validateUrl = (url: string): ValidationResult => {
  if (!url || url.trim().length === 0) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

// Utility function for validating multiple fields
export const validateForm = (validations: (() => ValidationResult)[]): ValidationResult => {
  for (const validate of validations) {
    const result = validate();
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
};

// Generic input validation function for security tests
export const validateInput = (input: any, rules: any[] = []): ValidationResult => {
  if (!input) {
    return { isValid: false, error: 'Input is required' };
  }
  
  // Basic validation - can be extended based on rules
  if (typeof input === 'string' && input.trim().length === 0) {
    return { isValid: false, error: 'Input cannot be empty' };
  }
  
  // Apply validation rules if provided
  if (rules.length > 0) {
    for (const rule of rules) {
      if (rule.validate && typeof rule.validate === 'function') {
        const result = rule.validate(input);
        if (!result.isValid) {
          return result;
        }
      }
    }
  }
  
  return { isValid: true };
}; 