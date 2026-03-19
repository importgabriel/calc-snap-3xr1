"use client";

import { useCallback, useEffect, useReducer } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operator = "+" | "-" | "×" | "÷";

interface CalcState {
  displayValue: string;
  previousValue: string | null;
  operator: Operator | null;
  waitingForOperand: boolean;
  expression: string; // shown above the main display
}

type CalcAction =
  | { type: "DIGIT"; digit: string }
  | { type: "DECIMAL" }
  | { type: "OPERATOR"; operator: Operator }
  | { type: "EQUALS" }
  | { type: "CLEAR" }
  | { type: "ALL_CLEAR" }
  | { type: "NEGATE" }
  | { type: "PERCENT" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_DISPLAY_LENGTH = 12;

function formatDisplay(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  // If the string already has a trailing decimal (user typing) keep it as-is
  if (value.endsWith(".")) return value;

  // Trim excessively long decimals for display
  const parts = value.split(".");
  if (parts[1] && parts[1].length > 8) {
    return parseFloat(num.toPrecision(9)).toString();
  }
  return value;
}

function compute(a: string, b: string, op: Operator): string {
  const left = parseFloat(a);
  const right = parseFloat(b);
  let result: number;

  switch (op) {
    case "+":
      result = left + right;
      break;
    case "-":
      result = left - right;
      break;
    case "×":
      result = left * right;
      break;
    case "÷":
      if (right === 0) return "Error";
      result = left / right;
      break;
  }

  // Avoid floating-point noise for simple cases
  const str = parseFloat(result.toPrecision(12)).toString();
  return str;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: CalcState = {
  displayValue: "0",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
  expression: "",
};

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "ALL_CLEAR":
      return { ...initialState };

    case "CLEAR":
      // If waiting for operand, behave like AC
      if (state.waitingForOperand) return { ...initialState };
      return {
        ...state,
        displayValue: "0",
        // If we've typed something into the current operand, just clear it
        expression:
          state.operator && state.previousValue
            ? `${state.previousValue} ${state.operator}`
            : "",
      };

    case "DIGIT": {
      const { digit } = action;
      if (state.displayValue === "Error") return { ...initialState, displayValue: digit };

      if (state.waitingForOperand) {
        return {
          ...state,
          displayValue: digit,
          waitingForOperand: false,
        };
      }

      // Don't allow more than MAX_DISPLAY_LENGTH characters
      if (state.displayValue.replace("-", "").replace(".", "").length >= MAX_DISPLAY_LENGTH) {
        return state;
      }

      const newDisplay =
        state.displayValue === "0" ? digit : state.displayValue + digit;

      return { ...state, displayValue: newDisplay };
    }

    case "DECIMAL": {
      if (state.displayValue === "Error") return { ...initialState, displayValue: "0." };

      if (state.waitingForOperand) {
        return { ...state, displayValue: "0.", waitingForOperand: false };
      }

      if (state.displayValue.includes(".")) return state;

      return { ...state, displayValue: state.displayValue + "." };
    }

    case "OPERATOR": {
      const { operator } = action;
      if (state.displayValue === "Error") return { ...initialState };

      // Chain operations: if we already have a pending operator + previous value
      // and we haven't just pressed an operator, compute first.
      if (state.operator && !state.waitingForOperand && state.previousValue !== null) {
        const result = compute(state.previousValue, state.displayValue, state.operator);
        return {
          ...state,
          displayValue: result,
          previousValue: result,
          operator,
          waitingForOperand: true,
          expression: `${result} ${operator}`,
        };
      }

      return {
        ...state,
        previousValue: state.displayValue,
        operator,
        waitingForOperand: true,
        expression: `${state.displayValue} ${operator}`,
      };
    }

    case "EQUALS": {
      if (state.displayValue === "Error") return { ...initialState };
      if (!state.operator || state.previousValue === null) {
        return { ...state, expression: "" };
      }

      const result = compute(state.previousValue, state.displayValue, state.operator);
      return {
        ...state,
        displayValue: result,
        previousValue: null,
        operator: null,
        waitingForOperand: true,
        expression: `${state.previousValue} ${state.operator} ${state.displayValue} =`,
      };
    }

    case "NEGATE": {
      if (state.displayValue === "Error" || state.displayValue === "0") return state;
      const negated = (parseFloat(state.displayValue) * -1).toString();
      return { ...state, displayValue: negated };
    }

    case "PERCENT": {
      if (state.displayValue === "Error") return state;
      const pct = (parseFloat(state.displayValue) / 100).toString();
      return { ...state, displayValue: pct };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Button config
// ---------------------------------------------------------------------------

interface ButtonDef {
  label: string;
  action: CalcAction;
  variant: "function" | "operator" | "digit" | "zero" | "equals";
  wide?: boolean;
}

const BUTTONS: ButtonDef[] = [
  { label: "AC", action: { type: "ALL_CLEAR" }, variant: "function" },
  { label: "+/-", action: { type: "NEGATE" }, variant: "function" },
  { label: "%", action: { type: "PERCENT" }, variant: "function" },
  { label: "÷", action: { type: "OPERATOR", operator: "÷" }, variant: "operator" },

  { label: "7", action: { type: "DIGIT", digit: "7" }, variant: "digit" },
  { label: "8", action: { type: "DIGIT", digit: "8" }, variant: "digit" },
  { label: "9", action: { type: "DIGIT", digit: "9" }, variant: "digit" },
  { label: "×", action: { type: "OPERATOR", operator: "×" }, variant: "operator" },

  { label: "4", action: { type: "DIGIT", digit: "4" }, variant: "digit" },
  { label: "5", action: { type: "DIGIT", digit: "5" }, variant: "digit" },
  { label: "6", action: { type: "DIGIT", digit: "6" }, variant: "digit" },
  { label: "−", action: { type: "OPERATOR", operator: "-" }, variant: "operator" },

  { label: "1", action: { type: "DIGIT", digit: "1" }, variant: "digit" },
  { label: "2", action: { type: "DIGIT", digit: "2" }, variant: "digit" },
  { label: "3", action: { type: "DIGIT", digit: "3" }, variant: "digit" },
  { label: "+", action: { type: "OPERATOR", operator: "+" }, variant: "operator" },

  { label: "0", action: { type: "DIGIT", digit: "0" }, variant: "zero", wide: true },
  { label: ".", action: { type: "DECIMAL" }, variant: "digit" },
  { label: "=", action: { type: "EQUALS" }, variant: "equals" },
];

// ---------------------------------------------------------------------------
// Keyboard mapping
// ---------------------------------------------------------------------------

function keyToAction(key: string): CalcAction | null {
  if (key >= "0" && key <= "9") return { type: "DIGIT", digit: key };
  if (key === ".") return { type: "DECIMAL" };
  if (key === "+") return { type: "OPERATOR", operator: "+" };
  if (key === "-") return { type: "OPERATOR", operator: "-" };
  if (key === "*") return { type: "OPERATOR", operator: "×" };
  if (key === "/") return { type: "OPERATOR", operator: "÷" };
  if (key === "Enter" || key === "=") return { type: "EQUALS" };
  if (key === "Escape") return { type: "ALL_CLEAR" };
  if (key === "Backspace") return { type: "CLEAR" };
  if (key === "%") return { type: "PERCENT" };
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const variantStyles: Record<ButtonDef["variant"], string> = {
  function:
    "bg-gray-400 hover:bg-gray-300 active:bg-gray-200 text-black",
  operator:
    "bg-amber-400 hover:bg-amber-300 active:bg-amber-200 text-white",
  digit:
    "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white",
  zero:
    "bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white col-span-2 justify-start pl-7",
  equals:
    "bg-amber-400 hover:bg-amber-300 active:bg-amber-200 text-white",
};

interface CalcButtonProps {
  def: ButtonDef;
  isActive?: boolean;
  onPress: (action: CalcAction) => void;
}

function CalcButton({ def, isActive, onPress }: CalcButtonProps) {
  return (
    <button
      onClick={() => onPress(def.action)}
      className={[
        "flex items-center rounded-full text-[2rem] font-normal select-none",
        "transition-colors duration-75 cursor-pointer",
        "h-[82px]",
        variantStyles[def.variant],
        isActive && def.variant === "operator"
          ? "bg-white text-amber-400 hover:bg-gray-100"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={def.label}
    >
      <span
        className={
          def.variant === "zero"
            ? ""
            : "flex items-center justify-center w-full"
        }
      >
        {def.label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Responsive display font sizing
// ---------------------------------------------------------------------------

function getDisplayFontSize(value: string): string {
  const len = value.length;
  if (len <= 6) return "text-[5rem]";
  if (len <= 9) return "text-[4rem]";
  if (len <= 12) return "text-[3rem]";
  return "text-[2.5rem]";
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Calculator() {
  const [state, dispatch] = useReducer(calcReducer, initialState);

  const handleAction = useCallback((action: CalcAction) => {
    dispatch(action);
  }, []);

  // Keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Prevent default for "/" so it doesn't open browser find bar
      if (e.key === "/") e.preventDefault();
      const action = keyToAction(e.key);
      if (action) dispatch(action);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeOperator = state.waitingForOperand ? state.operator : null;
  const displayLabel = formatDisplay(state.displayValue);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
      {/* Calculator shell */}
      <div className="w-full max-w-[380px]">
        {/* Display */}
        <div className="flex flex-col items-end justify-end px-4 pb-2 min-h-[140px]">
          {/* Expression row */}
          <p className="text-gray-500 text-xl h-7 truncate w-full text-right">
            {state.expression}
          </p>

          {/* Main value */}
          <p
            className={[
              "text-white font-light leading-none mt-2 transition-all duration-100",
              getDisplayFontSize(displayLabel),
            ].join(" ")}
            aria-live="polite"
            aria-label={`Display: ${displayLabel}`}
          >
            {displayLabel}
          </p>
        </div>

        {/* Button grid */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {BUTTONS.map((btn) => (
            <CalcButton
              key={btn.label}
              def={btn}
              isActive={activeOperator === (btn.action as { operator?: Operator }).operator}
              onPress={handleAction}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-gray-600 text-xs mt-6 select-none">
          Keyboard supported · Esc to clear · Backspace to delete
        </p>
      </div>
    </div>
  );
}
