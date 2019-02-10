
/**
Classes
*/
class ValidationEnvironment {
    constructor() {
        this.rootObject = undefined; 
        this.objectKey = []; 
    }
    clone () {
        let cloneVEnv = new ValidationEnvironment(); 
        cloneVEnv.rootObject = this.rootObject; 
        cloneVEnv.objectKey = this.objectKey.slice(0, this.objectKey.length); 
        return cloneVEnv;
    }
}

class ValidationResult {
    constructor() {
        this.result = true;
        this.reasons = new Array();
    }

    toJSON () {
        return {
            "result":this.result,
            "reasons":this.reasons
        };
    }
}

class ValueRange {
    constructor() {
        this.isIncLower = false;
        this.isIncUpper = false;
        this.lowerBound = undefined;
        this.upperBound = undefined;
    }
}


/**
Library
*/
var DSPA = new function () {
    /*
    Constants
    */
    this.DATA_TYPE = {
        'BOOLEAN':'boolean',
        'INT':'int',
        'FLOAT':'float',
        'STRING':'string',
        'ARRAY':'array',
        'OBJECT':'object'
    };

    this.SPEC_KEY = {
        'TYPE': '__type__',
        'CHILDREN':'__children__',
        'ITEM':'__item__',
        'ITEMS':'__items__',
        'LENGTH':'__length__',
        'RANGE':'__range__',
        'MEMBERSHIP':'__membership__',
        'REQUIRED':'__required__', /* The default value is true */
        'REGEX':'__regex__'
    };

    this.VAR_NAME = {
        'SELF':'self'
    };

    /**
    Type-check utils
    */
    this.isUndefined = function (x) {
        return (typeof x === 'undefined');
    };

    this.isBoolean = function (b) {
        return (!this.isUndefined(b)) && ((typeof b === 'boolean') || (b instanceof Boolean));
    };

    this.isInt = function (n) {
        return (!this.isUndefined(n)) && (Number(n) === n && n % 1 === 0);
    };

    this.isFloat = function (n) {
        return (!this.isUndefined(n)) && (Number(n) === n && n % 1 !== 0);
    };

    this.isString = function (s) {
        return (!this.isUndefined(s)) && ((typeof s === 'string') || (s instanceof String)); 
    };

    this.isArray = function (a) {
        return (!this.isUndefined(a)) && (typeof a === 'object') && (a.constructor === Array);
    };

    this.isObject = function (obj) {
        return (!this.isUndefined(obj)) && (typeof obj === 'object') && (obj.constructor === Object);
    };

    this.isFunction = function (f) {
        return (!this.isUndefined(f)) && (typeof f === 'function');
    };

    this.isKey = function (k) {
        if (!this.isString(k)) {
            return false;
        }
        if (k.find(' ') >= 0) {
            return false;
        }
        if (k.find('.') >= 0) {
            return false;
        }
        return true;
    };

    this.isKeyword = function (k) {
        return false;
    };

    this.isSpec = function (spec) {
        if (!this.isObject(spec)) {
            return false;
        }
        return true;
    };

    this.isValueRange = function (r) {
        return (!this.isUndefined(r)) && (typeof r === 'object') && (r.constructor === ValueRange);
    };

    this.isRegExp = function (re) {
        return (!this.isUndefined(re)) & (typeof re === 'object') && (re.constructor === RegExp); 
    }; 

    this.isValidationResult = function (r) {
        return (!this.isUndefined(r) && (typeof r === 'object') && (r.constructor === ValidationResult));
    };

    this.isValidationEnvironment = function (r) {
        return (!this.isUndefined(r) && (typeof r === 'object') && (r.constructor === ValidationEnvironment));
    };

    this.isCollection = function (c, type) {
        if (!this.isArray(c)) {
            return false;
        }
        if (!this.isString(type)) {
            return false;
        }
        let i = 0;
        for (i = 0 ; i < c.length ; i++) {
            if (!this.validateType(c[i], type)) {
                return false;
            }
        }
        return true;
    };

    this.isSafePredicateCode = function (s) {
        return (this.isString(s));
    };

    /**
    Parsing utils
    */
    this.parseBoolean = function (b) {
        if (this.isBoolean(b)) {
            return b; 
        }
        if (this.isString(b)) {
            if (String(b).toLowerCase() == 'true') {
                return true; 
            }
            if (String(b).toLowerCase() == 'false') {
                return false; 
            }
        }
        throw new Error('Failed to parse Boolean')
    };

    this.parseValueRange = function (s) {
        let valueRange = new ValueRange();

        if (this.isInt(s) || this.isFloat(s)) {
            valueRange.isIncLower = true;
            valueRange.isIncUpper = true;
            valueRange.lowerBound = s;
            valueRange.upperBound = s;
        }
        else if (this.isString(s)) {
            s = s.trim();
            if (s.length > 0) {
                let firstChar = s.substring(0, 1);
                let lastChar = s.substring(s.length-1, s.length);
                if ((firstChar === '(' || firstChar === '[') && (lastChar === ')' || lastChar === ']')) { // a range string
                    let twoValueString = s.substring(1, s.length-1);
                    if (twoValueString.length > 3) {
                        let valueStrings = twoValueString.split(',');
                        if (valueStrings.length == 2) {
                            try {
                                let vlb = parseFloat(valueStrings[0]);
                                let vub = parseFloat(valueStrings[1]);
                                if (vlb > vub) {
                                    throw new Error("Invalid value string");
                                }
                                valueRange.isIncLower = (firstChar === '[');
                                valueRange.isIncUpper = (lastChar === ']');
                                valueRange.lowerBound = vlb;
                                valueRange.upperBound = vub;
                            } catch (ex) {
                                throw new Error("Invalid value string");
                            }
                        }
                        else {
                            throw new Error("Invalid value string");
                        }
                    }
                    else {
                        throw new Error("Invalid value string");
                    }
                }
                else { // a value string
                    try {
                        let fvalue = parseFloat(s);
                        return this.parseValueRange(fvalue);
                    } catch (ex) {
                        throw new Error("Invalid value string");
                    }
                }
            }
            else {
                throw new Error("Cannot parse a value range from an empty string");
            }
        }
        else {
            throw new Error("Unsupported type for s");
        }

        return valueRange;
    };

    this.parseRegExp = function (s) {
        if (this.isString(s)) {
            s = s.trim(); 
            let indexFirstSlash = s.indexOf("/"); 
            let indexLastSlash = s.lastIndexOf("/"); 
            if (indexFirstSlash == 0 && indexLastSlash > 0) {
                let regexPattern = s.substring(indexFirstSlash+1, indexLastSlash); 
                let regexFlag = ""; 
                if (indexLastSlash + 1 < s.length) {
                    regexFlag = s.substring(indexLastSlash + 1); 
                }
                if (regexFlag == "") {
                    return new RegExp(regexPattern); 
                }
                else if (regexFlag == "g" || regexFlag == "i" || regexFlag == "m" || regexFlag == "u" || regexFlag == "y") {
                    return new RegExp(regexPattern, regexFlag); 
                }
                else {
                    throw new Error("Unknown regexFlag: " + regexFlag); 
                }
            }
            else {
                throw new Error("Invalid indices of slashes"); 
            }
        }
        else {
            throw new Error("Unsupported type for s"); 
        }
    };

    this.parseRequiredExpr = function (refObj, exprRequired) {
        try {
            let isRequired = this.parseBoolean(exprRequired); 
            return isRequired; 
        } catch (ex) {
            ;
        }

        if (!this.isObject(refObj)) {
            throw new Error("refObj is not an object"); 
        }

        if (!this.isArray(exprRequired)) {
            throw new Error("exprRequired is not an array"); 
        }

        throw new Error("Invalid required expression"); 
    }; 

    /**
    IO utils
    */
    this.accessValue = function (obj, valKey) {
        if (!this.isObject(obj)) {
            throw new Error("obj is not an object");
        }
        
        if (!this.isArray(valKey)) {
            throw new Error("valKey is not an array");
        }

        if (valKey.length == 0) {
            return obj; 
        }
        
        let childkey = valKey[0]; 
        if (obj.hasOwnProperty(childkey)) {
            let childObj = obj[childkey]; 
            if (valKey.length == 1) {
                return childObj;
            }
            else {
                return this.accessValue(childObj, valKey.slice(1, valKey.length));
            }
        }
        else {
            return undefined; 
        }
    }; 

    this.printObject = function (obj, lenIndent) {
        if (!this.isObject(obj)) {
            throw new Error("obj is not an object");
        }
        if (!this.isInt(lenIndent)) {
            throw new Error("lenIndent is not an integer");
        }
        return JSON.stringify(obj, undefined, lenIndent);
    };

    /** 
    Predicates 
     */
    this.hasRequired = function (obj, valKey) {
        if (!this.isObject(obj)) {
            throw new Error("obj is not an object");
        }
        
        if (!this.isArray(valKey)) {
            throw new Error("valKey is not an array");
        }    

        let val = this.accessValue(obj, valKey); 

        return this.isUndefined(val); 
    };

    /**
    Validation utils
    */
    this.validateType = function (value, type) {
        if (!this.isString(type)) {
            throw new Error("type is not a string");
        }

        if (type === this.DATA_TYPE.BOOLEAN) {
            return this.isBoolean(value); 
        }
        if (type === this.DATA_TYPE.STRING) {
            return this.isString(value);
        }
        if (type === this.DATA_TYPE.INT) {
            return this.isInt(value);
        }
        if (type === this.DATA_TYPE.FLOAT) {
            return this.isFloat(value);
        }
        if (type === this.DATA_TYPE.ARRAY) {
            return this.isArray(value);
        }
        if (type === this.DATA_TYPE.OBJECT) {
            return this.isObject(value);
        }

        throw new Error("unknown type: " + type);
    };

    this.validateMembership = function (value, collection, type) {
        if (!this.validateType(value, type)) {
            return false;
        }
        if (!this.isCollection(collection, type)) {
            return false;
        }

        return collection.includes(value);
    };

    this.validateValueRange = function(value, valueRange) {
        if (!this.isValueRange(valueRange)) {
            throw new Error("valueRange is not a ValueRange");
        }

        if (valueRange.isIncLower && value == valueRange.lowerBound) {
            return true;
        }
        if (valueRange.isIncUpper && value == valueRange.upperBound) {
            return true;
        }

        return (valueRange.lowerBound < value && value < valueRange.upperBound);
    };

    this.validateRegexSearch = function (value, regex) {
        if (!this.isString(value)) {
            throw new Error("value is not a string"); 
        }
        if (!this.isRegExp(regex)) {
            throw new Error("regex is not a RegExp"); 
        }
        return (value.search(regex) >= 0); 
    }; 

    this.addValidationFail = function(validationEnv, validationResult, reason) {
        if (!this.isValidationEnvironment(validationEnv)) {
            throw new Error("validationEnv is not a ValidationEnvironment"); 
        }
        if (!this.isValidationResult(validationResult)) {
            throw new Error("validationResult is not a ValidationResult");
        }
        if (!this.isString(reason)) {
            throw new Error("reason is not a string");
        }
        validationResult.result = false;
        validationResult.reasons.push("[" + String(validationEnv.objectKey) + "] : " + reason);
    };

    /**
    Validation procedures
    */
    this.validateDataWithSpecUnderEnv = function (validationEnv, data, spec) {
        if (!this.isValidationEnvironment(validationEnv)) {
            throw new Error("validationEnv is not a ValidationEnvironment"); 
        }
        if (!this.isSpec(spec)) {
            throw new Error("spec is not a Spec");
        }

        // Report object
        let validationResult = new ValidationResult();

        // Check data type
        let dataType = undefined;
        if (spec.hasOwnProperty(this.SPEC_KEY.TYPE)) {
            dataType = spec[this.SPEC_KEY.TYPE];
            if (!this.validateType(data, dataType)) {
                this.addValidationFail(validationEnv, validationResult, "The data is not type " + dataType);
            }
        }
        else {
            this.addValidationFail(validationEnv, validationResult, "No data type specified in the Spec");
        }
        if (!validationResult.result) {
            return validationResult;
        }

        // Different validation processes based on the data type
        if (dataType === this.DATA_TYPE.BOOLEAN) {
            // Nothing to do with boolean ... 
        }
        else if (dataType === this.DATA_TYPE.OBJECT) {
            // Check the children
            if (spec.hasOwnProperty(this.SPEC_KEY.CHILDREN)) {
                // Check the unknown children in the data
                let childrenSpecs = spec[this.SPEC_KEY.CHILDREN];
                let dataChildrenKeys = Object.getOwnPropertyNames(data);
                let i = 0;
                for (i = 0 ; i < dataChildrenKeys.length ; i++) {
                    if (!childrenSpecs.hasOwnProperty(dataChildrenKeys[i])) {
                        this.addValidationFail(validationEnv, validationResult, "Unknown key " + dataChildrenKeys[i]);
                    }
                }

                // Validate the children
                let specChildrenKeys = Object.getOwnPropertyNames(childrenSpecs);
                for (i = 0 ; i < specChildrenKeys.length ; i++) {
                    let childKey = specChildrenKeys[i];
                    let childSpec = childrenSpecs[childKey];

                    let childVEnv = validationEnv.clone();
                    childVEnv.objectKey.push(childKey);

                    if (data.hasOwnProperty(childKey)) {
                        let childValidationResult = this.validateDataWithSpecUnderEnv(childVEnv, data[childKey], childSpec);
                        validationResult.result = (validationResult.result && childValidationResult.result);
                        validationResult.reasons = validationResult.reasons.concat(childValidationResult.reasons);
                    }
                    else { // The field is not populated
                        let exprRequired = true; 
                        if (childSpec.hasOwnProperty(this.SPEC_KEY.REQUIRED)) {
                            exprRequired = childSpec[this.SPEC_KEY.REQUIRED]; 
                        }
                        let isRequired = this.parseRequiredExpr(validationEnv.rootObject, exprRequired); 
                        if (isRequired) {
                            this.addValidationFail(validationEnv, validationResult, "Missed field " + childKey);
                        }
                    }
                }
            }
            else {
                throw new Error("Invalid Spec -- no " + this.SPEC_KEY.CHILDREN + " specified for Json spec");
            }
        }
        else if (dataType === this.DATA_TYPE.INT || dataType === this.DATA_TYPE.FLOAT) {
            // Check range
            if (spec.hasOwnProperty(this.SPEC_KEY.RANGE)) {
                let valueRange = this.parseValueRange(spec[this.SPEC_KEY.RANGE]);
                if (!this.validateValueRange(data, valueRange)) {
                    this.addValidationFail(validationEnv, validationResult, " " + dataType + " out of range");
                }
            }
        }
        else if (dataType === this.DATA_TYPE.ARRAY) {
            // Check length
            if (spec.hasOwnProperty(this.SPEC_KEY.LENGTH)) {
                let valueRange = this.parseValueRange(spec[this.SPEC_KEY.LENGTH]);
                if (!this.validateValueRange(data.length, valueRange)) {
                    this.addValidationFail(validationEnv, validationResult, "array-length out of range");
                }
            }
            
            // Check __item__ 
            if (spec.hasOwnProperty(this.SPEC_KEY.ITEM)) {
                let itemSpec = spec[this.SPEC_KEY.ITEM]; 
                for (let i = 0 ; i < data.length ; i++) {
                    let item = data[i]; 

                    let childVEnv = validationEnv.clone();
                    childVEnv.objectKey.push(i); 

                    let itemValidationResult = this.validateDataWithSpecUnderEnv(childVEnv, item, itemSpec); 
                    validationResult.result = (validationResult.result && itemValidationResult.result);
                    validationResult.reasons = validationResult.reasons.concat(itemValidationResult.reasons);
                }
            }

            // Check __items__
            if (spec.hasOwnProperty(this.SPEC_KEY.ITEMS)) {
                let itemSpecs = spec[this.SPEC_KEY.ITEMS]; 
                
                if (itemSpecs.length == data.length) {
                    for (let i = 0 ; i < data.length ; i++) {
                        let dataItem = data[i]; 
                        let specItem = spec[this.SPEC_KEY.ITEMS][i]; 

                        let childVEnv = validationEnv.clone(); 
                        childVEnv.objectKey.push(i); 

                        let itemValidationResult = this.validateDataWithSpecUnderEnv(childVEnv, dataItem, specItem); 
                        validationResult.result = (validationResult.result && itemValidationResult.result); 
                        validationResult.reasons = validationResult.reasons.concat(itemValidationResult.reasons); 
                    }
                }
                else {
                    this.addValidationFail(validationEnv, validationResult, "The # of array item in spec does not match with the data array"); 
                }
            }
        }
        else if (dataType ===  this.DATA_TYPE.STRING) {
            // Check length 
            if (spec.hasOwnProperty(this.SPEC_KEY.LENGTH)) {
                let valueRange = this.parseValueRange(spec[this.SPEC_KEY.LENGTH]);
                if (!this.validateValueRange(data.length, valueRange)) {
                    this.addValidationFail(validationEnv, validationResult, "string-length out of range");
                }
            }

            // Check regex 
            if (spec.hasOwnProperty(this.SPEC_KEY.REGEX)) {
                try {
                    let regex = this.parseRegExp(spec[this.SPEC_KEY.REGEX]);
                    if (!this.validateRegexSearch(data, regex)) {
                        this.addValidationFail(validationEnv, validationResult, "REGEX validation failed"); 
                    }
                } catch (ex) {
                    this.addValidationFail(validationEnv, validationResult, "Unexpected fail when checking REGEX: " + String(ex));
                }
            }
        }
        else {
            throw new Error("Uncaught dataType: " + dataType);
        }
        
        // Return
        return validationResult;
    };

    this.validateDataWithSpec = function (data, spec) {
        let validationEnv = new ValidationEnvironment(); 
        validationEnv.rootObject = data; 
        validationEnv.objectKey = []; 
        return this.validateDataWithSpecUnderEnv(validationEnv, data, spec); 
    }
};
