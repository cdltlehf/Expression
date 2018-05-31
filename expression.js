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
        if (typeof variable == 'number') variable = Variable.constant(variable);
        this._value = variable._value;
        this._diff = (wrt) => variable.diff(wrt);
        this._type = Math.max(variable._type + 1, 2);
    }

    get isConstant() { return this._type == 0; }
    get isIndependent() { return this._type == 1; }
    get isDependent() { return this._type == 2; }

    get isUndefined() { try { this.value } catch { return true; } return false; }
    get isDefined() { try { this.value } catch { return false; } return true; }

    get value() {
        if (!this._value) throw new Error(`${this} is undefined!\n`);
        return this._value();
    }
    get type() { return this._type; }
    get opPre() { return this._opPre; }

    toString() { return this._str(); }
    valueOf() { return this.value; }

    diff(wrt) {
        if (wrt.isConstant) throw new Error(`${wrt} is constant!\n`);
        else if (this.isConstant) return Variable.constant(0);
        else if (wrt === this) return Variable.constant(1);
        else if (this.isIndependent) return Variable.constant(0);
        else if (this._diff) return this._diff(wrt);
        else throw new Error(`I can't differentiate ${this}!\n`);
    }

    add(x2) { return Variable.add(this, x2); }
    sub(x2) { return Variable.sub(this, x2); }
    mul(x2) { return Variable.mul(this, x2); }
    div(x2) { return Variable.div(this, x2); }
    pow(x2) { return Variable.pow(this, x2); }

    static add(x1, x2) {
        if (typeof x1 == 'number') x1 = Variable.constant(x1);
        if (typeof x2 == 'number') x2 = Variable.constant(x2);
        if( x1.isConstant && x2.isConstant ) return Variable.constant(x1.value + x2.value);
        else if( x2.isConstant && x2.value == 0 ) return x1;
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
        if (typeof x1 == 'number') x1 = Variable.constant(x1);
        if (typeof x2 == 'number') x2 = Variable.constant(x2);
        if( x1.isConstant && x2.isConstant ) return Variable.constant(x1.value - x2.value);
        else if( x2.isConstant && x2.value == 0 ) return x1;
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
    static mul(x1, x2) {
        if (typeof x1 == 'number') x1 = Variable.constant(x1);
        if (typeof x2 == 'number') x2 = Variable.constant(x2);
        if( x1.isConstant && x2.isConstant ) return Variable.constant(x1.value * x2.value);
        else if( x2.isConstant && x2.value == 0 ) return Variable.constant(0);
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
                Variable.mul(
                    x1.diff(wrt),
                    x2
                ),
                Variable.mul(
                    x1,
                    x2.diff(wrt)
                )
            ),
            2,
            3
        );
    }
    static div(x1, x2) {
        if (typeof x1 == 'number') x1 = Variable.constant(x1);
        if (typeof x2 == 'number') x2 = Variable.constant(x2);
        if( x2.isConstant && x2.value == 0 ) throw new Error(`${x2} is zero!`);
        else if( x1.isConstant && x2.isConstant ) return Variable.constant(x1.value / x2.value);
        else if( x1.isConstant && x1.value == 0 ) return Variable.constant(0);
        else if( x2.isConstant && x2.value == 1 ) return x1;
        else return new Variable(
            () => (x1._opPre>3?`(${x1})`:`${x1}`) + "/" + (x2._opPre>=3?`(${x2})`:`${x2}`),
            () => x1.value / x2.value,
            (wrt) => Variable.div(
                Variable.sub(
                    Variable.mul(
                        x1.diff(wrt), 
                        x2
                    ),
                    Variable.mul(
                        x1, 
                        x2.diff(wrt)
                    )
                ), 
                Variable.pow(
                    x2, 
                    Variable.constant(2)
                )
            ),
            2,
            3
        );
    }
    static pow(x1, x2) {
        if (typeof x1 == 'number') x1 = Variable.constant(x1);
        if (typeof x2 == 'number') x2 = Variable.constant(x2);
        if( x1.isConstant && x2.isConstant ) return Variable.constant(Math.pow(x1.value, x2.value))
        else if( x1.isConstant && x1.value == 1 ) return Variable.constant(1)
        else if( x1.isConstant && x1.value == 0 ) return Variable.constant(0)
        else if( x1.isConstant && x1.value == Math.E ) return Variable.exp(x2)
        else return new Variable(
            () => (x1._opPre>1?`(${x1})`:`${x1}`) + "^" + (x2._opPre>=1?`(${x2})`:`${x2}`),
            () => Math.pow(x1.value, x2.value),
            (wrt) => Variable.add(
                Variable.mul(x1.diff(wrt), Variable.mul(x2, Variable.pow(x1, Variable.sub(x2, Variable.constant(1))))),
                Variable.mul(x2.diff(wrt), Variable.mul(Variable.log(x1), Variable.pow(x1, x2)))
            ),
            2,
            1
        )
    }
    static minus(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return Variable.constant(-x.value);
        else return new Variable(
            () => "-" + (x._opPre>=2?`(${x})`:`${x}`),
            () => -x.value,
            (wrt) => Variable.minus(x.diff(wrt)),
            2,
            2
        ); 
    }
    static exp(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.exp(x));
        else return new Variable(
            () => `exp(${x})`,
            () => Math.exp(x.value),
            (wrt) => Variable.mul(
                x.diff(wrt),
                Variable.exp(x)
            ),
            2,
            1
        );
    }
    static log(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.exp(x));
        else return new Variable(
            () => `log(${x})`,
            () => Math.log(x.value),
            (wrt) => Variable.div(
                x.diff(wrt),
                x
            ),
            2,
            1
        );
    }
    static sin(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.sin(x));
        else return new Variable(
            () => `sin(${x})`,
            () => Math.sin(x.value),
            (wrt) => Variable.mul(
                x.diff(wrt),
                Variable.cos(x)
            ),
            2,
            1
        );
    }
    static cos(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.cos(x));
        else return new Variable(
            () => `cos(${x})`,
            () => Math.cos(x.value),
            (wrt) => Variable.mul(
                Variable.minus(x.diff(wrt)),
                Variable.sin(x)
            ),
            2,
            1
        );
    }
    static tan(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.tan(x));
        else return new Variable(
            () => `tan(${x})`,
            () => Math.tan(x.value),
            (wrt) => Variable.mul(
                x.diff(wrt),
                Variable.pow(
                    Variable.sec(x), 
                    Variable.constant(2)
                )
            ),
            2,
            1
        );
    }
    static csc(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.csc(x));
        else return new Variable(
            () => `csc(${x})`,
            () => Math.csc(x.value),
            (wrt) => Variable.mul(
                Variable.minus(
                    x.diff(wrt)
                ),
                Variable.mul(
                    Variable.csc(x),
                    Variable.cot(x)
                )
            ),
            2,
            1
        );
    }
    static sec(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.sec(x));
        else return new Variable(
            () => `sec(${x})`,
            () => Math.sec(x.value),
            (wrt) => Variable.mul(
                x.diff(wrt),
                Variable.mul(
                    Variable.sec(x),
                    Variable.tan(x)
                )
            ),
            2,
            1
        );
    }
    static cot(x) {
        if (typeof x == 'number') x = Variable.constant(x);
        if( x.isConstant ) return new Variable(Math.cot(x));
        else return new Variable(
            () => `cot(${x})`,
            () => Math.cot(x.value),
            (wrt) => Variable.mul(
                Variable.minus(
                    x.diff(wrt)
                ),
                Variable.pow(
                    Variable.csc(x),
                    Variable.constant(2)
                )
            ),
            2,
            1
        );
    }

    static taylor(f, x, a=0, n=10) {
        let t = Variable.constant(0);
        x.assign(Variable.constant(a));
        let term = f;
        for (let i=0;i<n;i++) {
            t = Variable.add(t, Variable.mul(Variable.constant(term.value), Variable.pow(Variable.sub(x, Variable.constant(a)), Variable.constant(i))))
            term = Variable.div(term.diff(x), Variable.constant(i+1))
            if (Number.isNaN(term.value)) break;
        }
        return t;
    }
}

const x = Variable.variable("x");
const y = Variable.variable("y");
const z = Variable.log(x.mul(y));

x.assign(3)
y.assign(4)
console.log(`${z.diff(x)} = ${z.diff(x).value}`)