class Variable {
    constructor(str, value, diff, type = 2, opPre = 0) {
        this._str = str;
        this._value = value;
        this._diff = diff;
        this._type = type; // 0: constant, 1: independent, 2: dependent
        this._opPre = opPre;
    }

    static constant(n, name) {
        return new Variable(
            !name?() => n:() => name,
            () => n,
            (wrt) => Variable.constant(0),
            0
        );
    }
    static variable(name) {
        return new Variable(
            () => name,
            undefined,
            (wrt) => Variable.constant(0),
            1
        )
    }

    assign(variable) {
        this._value = variable._value;
        this._diff = variable._diff;
        this._type = Math.max(variable._type + 1, 2);
    }

    get isConstant() { return this._type == 0; }
    get isIndependent() { return this._type == 1; }
    get isDependent() { return this._type == 2; }

    get isUndefined() { try { this.value } catch { return true; } return false; }
    get isDefined() { try { this.value } catch { return false; } return true; }

    get value() {
        if (!this._value) throw `${this} is undefined!\n`;
        return this._value();
    }
    get type() { return this._type; }
    get opPre() { return this._opPre; }

    toString() { return this._str(); }

    diff(wrt) {
        if (wrt.isConstant) throw new Error(`${wrt} is constant!\n`);
        else if (this.isConstant) return Variable.constant(0);
        else if (wrt === this) return Variable.constant(1);
        else if (this.isIndependent) return Variable.constant(0);
        else if (this._diff) return this._diff(wrt);
        else throw new Error(`${this} isn't differentiable!\n`);
    }

    static add(x1, x2) {
        if( x2.isConstant && x2.value == 0 ) return x1;
        else if( x1.isConstant && x1.value == 0 ) return x2;
        else return new Variable(
            () => (x1._opPre>5?`(${x1})`:`${x1}`) + "+" + (x2._opPre>=5?`(${x2})`:`${x2}`),
            () => x1.value + x2.value,
            (wrt) => Variable.add(
                x1.diff(wrt), 
                x2.diff(wrt)
            ),
            2,
            5
        );
    }
    static sub(x1, x2) {
        if( x2.isConstant && x2.value == 0 ) return x1;
        else if( x1.isConstant && x1.value == 0 ) return Variable.minus(x2);
        else return new Variable(
            () => (x1._opPre>5?`(${x1})`:`${x1}`) + "-" + (x2._opPre>=5?`(${x2})`:`${x2}`),
            () => x1.value - x2.value,
            (wrt) => Variable.sub(
                x1.diff(wrt), 
                x2.diff(wrt)
            ),
            2,
            5
        );
    }
    static multiply(x1, x2) {
        if( x2.isConstant && x2.value == 0 ) return Variable.constant(0);
        else if( x1.isConstant && x1.value == 0 ) return Variable.constant(0);

        else if( x1.isConstant && x1.value == -1 ) return Variable.minus(x2);
        else if( x2.isConstant && x2.value == -1 ) return Variable.minus(x1);

        else if( x2.isConstant && x2.value == 1 ) return x1;
        else if( x1.isConstant && x1.value == 1 ) return x2;
        else return new Variable(
            () => 
                (x1._opPre>3?`(${x1})`:`${x1}`) + 
                ((x1._opPre>3||x1._opPre==0)&&(x2._opPre>=3||x2._opPre==0)?"":"*") + 
                (x2._opPre>=3?`(${x2})`:`${x2}`),
            () => x1.value * x2.value,
            (wrt) => Variable.add(
                Variable.multiply(
                    x1.diff(wrt),
                    x2
                ),
                Variable.multiply(
                    x1,
                    x2.diff(wrt)
                )
            ),
            2,
            3
        );
    }
    static divide(x1, x2) {
        if( x2.isConstant && x2.value == 0 ) throw `${x2} is zero!`;
        else if( x1.isConstant && x1.value == 0 ) return Variable.constant(0);
        else if( x2.isConstant && x2.value == 1 ) return x1;
        else return new Variable(
            () => (x1._opPre>3?`(${x1})`:`${x1}`) + "/" + (x2._opPre>=3?`(${x2})`:`${x2}`),
            () => x1.value / x2.value,
            (wrt) => Variable.divide(
                Variable.sub(
                    Variable.multiply(
                        x1.diff(wrt), 
                        x2
                    ),
                    Variable.multiply(
                        x1, 
                        x2.diff(wrt)
                    )
                ), 
                Variable.multiply(
                    x2, 
                    x2
                )
            ),
            2,
            3
        );
    }
    static minus(x) {
        if( x.isConstant ) return Variable.constant(-x.value);
        else return new Variable(
            () => "-" + (x._opPre>=2?`(${x})`:`${x}`),
            () => -x.value,
            (wrt) => Variable.minus(x.diff),
            2,
            2
        ); 
    }
    static exp(x) {
        if( x.isConstant ) return new Variable(Math.exp(x));
        else return new Variable(
            () => `exp(${x})`,
            () => Math.exp(x.value),
            (wrt) => Variable.multiply(
                x.diff,
                Variable.exp(x)
            ),
            2,
            1
        );
    }
    static log(x) {
        if( x.isConstant ) return new Variable(Math.exp(x));
        else return new Variable(
            () => `log(${x})`,
            () => Math.log(x.value),
            (wrt) => Variable.divide(
                x.diff(wrt),
                x
            ),
            2,
            1
        );
    }
    static sin(x) {
        if( x.isConstant ) return new Variable(Math.sin(x));
        else return new Variable(
            () => `sin(${x})`,
            () => Math.sin(x.value),
            (wrt) => Variable.multiply(
                x.diff(wrt),
                Variable.cos(x)
            ),
            2,
            1
        );
    }
    static cos(x) {
        if( x.isConstant ) return new Variable(Math.cos(x));
        else return new Variable(
            () => `cos(${x})`,
            () => Math.cos(x.value),
            (wrt) => Variable.multiply(
                Variable.minus(x.diff(wrt)),
                Variable.sin(x)
            ),
            2,
            1
        );
    }
    static tan(x) {
        if( x.isConstant ) return new Variable(Math.tan(x));
        else return new Variable(
            () => `tan(${x})`,
            () => Math.tan(x.value),
            (wrt) => Variable.multiply(
                x.diff(wrt),
                Variable.multiply(
                    Variable.sec(x), 
                    Variable.sec(x)
                )
            ),
            2,
            1
        );
    }
    static csc(x) {
        if( x.isConstant ) return new Variable(Math.csc(x));
        else return new Variable(
            () => `csc(${x})`,
            () => Math.csc(x.value),
            (wrt) => Variable.multiply(
                Variable.minus(
                    x.diff(wrt)
                ),
                Variable.multiply(
                    Variable.csc(x),
                    Variable.cot(x)
                )
            ),
            2,
            1
        );
    }
    static sec(x) {
        if( x.isConstant ) return new Variable(Math.sec(x));
        else return new Variable(
            () => `sec(${x})`,
            () => Math.sec(x.value),
            (wrt) => Variable.multiply(
                x.diff(wrt),
                Variable.multiply(
                    Variable.sec(x),
                    Variable.tan(x)
                )
            ),
            2,
            1
        );
    }
    static cot(x) {
        if( x.isConstant ) return new Variable(Math.cot(x));
        else return new Variable(
            () => `cot(${x})`,
            () => Math.cot(x.value),
            (wrt) => Variable.multiply(
                Variable.minus(
                    x.diff(wrt)
                ),
                Variable.multiply(
                    Variable.csc(x),
                    Variable.csc(x)
                )
            ),
            2,
            1
        );
    }
}

const x = Variable.variable("x");
const y = Variable.sin(Variable.multiply(Variable.constant(2), x));

x.assign(Variable.constant(Math.random()));

console.log(`${x} = ${x.value}`)
console.log(`d(${y})/d${x} = ${y.diff(x)} : ${y.diff(x).value}`);