
/**
Classes
*/
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
        'INT':'int',
        'FLOAT':'float',
        'STRING':'string',
        'ARRAY':'array',
        'OBJECT':'object'
    };

    this.SPEC_KEY = {
        'TYPE': '__type__',
        'CHILDREN':'__children__',
        'LENGTH':'__length__',
        'RANGE':'__range__',
        'MEMBERSHIP':'__membership__',
        'REQUIRED':'__required__', /* The default value is true */
        'PREDICATE':'__predicate__'
    };

    this.VAR_NAME = {
        'SELF':'self'
    };

    this.PATH_SEPARATOR = '.';

    /**
    Type-check utils
    */
    this.isUndefined = function (x) {
        return (typeof x === 'undefined');
    };

    this.isInt = function (n) {
        return (!this.isUndefined(n)) && (Number(n) === n && n % 1 === 0);
    };

    this.isFloat = function (n) {
        return (!this.isUndefined(n)) && (Number(n) === n && n % 1 !== 0);
    };

    this.isString = function (s) {
        return (!this.isUndefined(s)) && (typeof s === 'string') || (s instanceof String);
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

    this.isValidationResult = function (r) {
        return (!this.isUndefined(r) && (typeof r === 'object') && (r.constructor === ValidationResult));
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

    this.parsePredicate = function (s) {
        if (this.isString(s)) {
            if (this.isSafePredicateCode(s)) {
                return new Function(this.VAR_NAME.SELF, s);
            }
            else {
                throw new Error("Unsafe predicate code");
            }
        }
        else {
            throw new Error("Unsupported type of s");
        }
    };

    /**
    IO utils
    */
    this.accessValue = function (obj, vpath) {
        if (!this.isObject(obj)) {
            throw new Error("obj is not an object");
        }
        if (!this.isString(vpath)) {
            throw new Error("vpath is not a string");
        }

        let currObj = obj;
        let keys = vpath.split(this.PATH_SEPARATOR);
        let i = 0;
        for (i = 0 ; i < keys.length ; i++) {
            if (this.isObject(currObj)) {
                if (currObj.hasOwnProperty(keys[i])) {
                    currObj = currObj[keys[i]];
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        }

        return currObj;
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
    Validation utils
    */
    this.validateType = function (value, type) {
        if (!this.isString(type)) {
            throw new Error("type is not a string");
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

    this.addValidationFail = function(validationResult, reason) {
        if (!this.isValidationResult(validationResult)) {
            throw new Error("validationResult is not a ValidationResult");
        }
        if (!this.isString(reason)) {
            throw new Error("reason is not a string");
        }
        validationResult.result = false;
        validationResult.reasons.push(reason);
    };

    /**
    Validation procedures
    */
    this.validateDataWithSpec = function (data, spec) {
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
                this.addValidationFail(validationResult, "The data is not type " + dataType);
            }
        }
        else {
            this.addValidationFail(validationResult, "No data type specified in the Spec");
        }
        if (!validationResult.result) {
            return validationResult;
        }

        // Different validation processes based on the data type
        if (dataType === this.DATA_TYPE.OBJECT) {
            // Check the children
            if (spec.hasOwnProperty(this.SPEC_KEY.CHILDREN)) {
                // Check the unknown children in the data
                let childrenSpecs = spec[this.SPEC_KEY.CHILDREN];
                let dataChildrenKeys = Object.getOwnPropertyNames(data);
                let i = 0;
                for (i = 0 ; i < dataChildrenKeys.length ; i++) {
                    if (!childrenSpecs.hasOwnProperty(dataChildrenKeys[i])) {
                        this.addValidationFail(validationResult, "Unknown key " + dataChildrenKeys[i]);
                    }
                }

                // Validate the children
                let specChildrenKeys = Object.getOwnPropertyNames(childrenSpecs);
                for (i = 0 ; i < specChildrenKeys.length ; i++) {
                    let childKey = specChildrenKeys[i];
                    let childSpec = childrenSpecs[childKey];

                    if (data.hasOwnProperty(childKey)) {
                        let childValidationResult = this.validateDataWithSpec(data[childKey], childSpec);
                        validationResult.result = (validationResult.result && childValidationResult.result);
                        validationResult.reasons = validationResult.reasons.concat(childValidationResult.reasons);
                    }
                    else { // The field is not populated
                        if (childSpec.hasOwnProperty(this.SPEC_KEY.REQUIRED) && (!childSpec[this.SPEC_KEY.REQUIRED])) { // If it is not required -> that's ok
                            ;
                        }
                        else { // If it is required -> return and error
                            this.addValidationFail(validationResult, "Missed field " + childKey);
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
                    this.addValidationFail(validationResult, " " + dataType + " out of range");
                }
            }
        }
        else if (dataType === this.DATA_TYPE.ARRAY) {
        }
        else if (dataType ===  this.DATA_TYPE.STRING) {
            // Check length 
            if (spec.hasOwnProperty(this.SPEC_KEY.LENGTH)) {
                let valueRange = this.parseValueRange(spec[this.SPEC_KEY.LENGTH]);
                if (!this.validateValueRange(data.length, valueRange)) {
                    this.addValidationFail(validationResult, "string-length out of range");
                }
            }
        }
        else {
            throw new Error("Uncaught dataType: " + dataType);
        }
        
        // Check predicate 
        if (spec.hasOwnProperty(this.SPEC_KEY.PREDICATE)) {
            predicateCode = spec[this.SPEC_KEY.PREDICATE]; 
            let predicate; 
            try {
                predicate = this.parsePredicate(predicateCode); 
            } catch (ex) {
                throw new Error("Cannot parse predicate: " + predicateCode); 
            }
            try {
                if (!predicate(data)) {
                    this.addValidationFail(validationResult, "predicate returns false: " + predicateCode); 
                }
            } catch (ex) {
                throw new Error("Predicate execution failed: " + predicateCode); 
            }
        }

        // Return
        return validationResult;
    };

};
