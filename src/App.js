
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { string } from 'mathjs';

function sanitizeExpression(expression) {
  // 1. Приводим к нижнему регистру для единообразия и удаляем пробелы
  let normalized = expression.replace(/\s+/g, '').toLowerCase();

  // 2. Заменяем математические операторы и константы
  normalized = normalized
    .replace(/\^/g, '**')
    .replace(/\b(\d+)([a-zA-Z])\b/g, '$1*$2')
    .replace(/\bax\b/g, 'a*x')
    .replace(/\bxa\b/g, 'x*a')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\basin\b/g, 'Math.asin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\bacos\b/g, 'Math.acos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bcotan\b/g, '1 / Math.tan')
    .replace(/\batan\b/g, 'Math.atan')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\blog\b/g, 'Math.log')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bln\b/g, 'Math.log');

  const testString = normalized.replace(/Math\.(sin|cos|tan|sqrt|abs|asin|acos|atan|cotan|log|exp|PI|E)/gi, '');

  if (!/^[0-9+\-*/().,xa]+$/i.test(testString) && testString.length > 0) {
    throw new Error('Invalid expression');
  }

  return normalized;
}

function buildSvgPath({ mathFunction, width, height, offsetX, offsetY, scale }) {
  if (!width || !height) {
    return '';
  }

  const centerX = width / 2;
  const centerY = height / 2;
  let path = '';
  let isFirstPointInSegment = true;

  const step = Math.max(1, Math.round(width / 400));

  for (let screenX = 0; screenX <= width; screenX += step) {
    const mathX = (screenX - (centerX + offsetX)) / scale / 24;
    const mathY = mathFunction(mathX);

    if (typeof mathY === 'number' && Number.isFinite(mathY)) {
      const screenY = centerY + offsetY - mathY * scale * 24;

      if (screenY >= -height && screenY <= height * 2) {
        if (isFirstPointInSegment) {
          path += ` M ${screenX} ${screenY}`;
          isFirstPointInSegment = false;
        } else {
          path += ` L ${screenX} ${screenY}`;
        }
        continue;
      }
    }

    isFirstPointInSegment = true;
  }

  return path;
}

function checkIfGuessed(mathFunction, secondMathFunction) {
  const testXValues = [-2, -1, 0.1, 0, 0.1, 1, 2];
  const tolerance = 0.01;
  /*
  
  for (const x of testXValues) {
    const y1 = mathFunction(x);
    const y2 = secondMathFunction(x);

    if (Math.abs(y1 - y2) > tolerance) {
      return false;
    }
  }

  //timesGuessed++;
  return true;
  */
}

function App() {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(1);
  const [scale, setScale] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  const [functionExpression, setFunctionExpression] = useState('x');
  const [expressionError, setExpressionError] = useState('');
  const [parameterA, setParameterA] = useState(1);
  const dragState = useRef({ active: false, lastX: 0, lastY: 0 });
  const stageRef = useRef(null);

  const { width, height } = viewportSize;

  const walidExpressionError = "Введите математически корректное выражение используя x и a"

  const functionColours = [
    '00aaff',
    'aa00ff',
    'ff00aa',
    'ffaa00',
    'aaff00'
  ];

  const templates = [
    'a*x + b',
    'a*x^2 + b*x',
    'sin(a*x) + b',
    'log(a*x) + b',
    'sqrt(ax) + b'
  ];

  const secondFunctionExpression = useMemo(() => {
    let index = Math.floor(Math.random() * templates.length);
    let template = templates[index];

    let a = Math.floor(Math.random() * 8) - 4;
    let b = Math.floor(Math.random() * 8) - 4;

    return template
      .replace(/\ba\b/g, a)
      .replace(/\bb\b/g, b)
    ;
  }, []);

  const functionColour = useMemo(() => {
    const index = functionExpression.length % functionColours.length;
    return `#${functionColours[index]}`;
  }, [functionExpression, functionColours]);

  const secondFunctionColour = useMemo(() => {
    const index = secondFunctionExpression.length % functionColours.length;
    return `#${functionColours[index]}`;
  }, [secondFunctionExpression, functionColours]);

  const mathFunction = useMemo(() => {
    try {
      const safeExpression = sanitizeExpression(functionExpression);
      const compiled = (x) => {
        // eslint-disable-next-line no-new-func
        const evaluate = new Function('x', 'a', `return (${safeExpression});`);
        return evaluate(x, parameterA);
      };
      setExpressionError('');
      return compiled;
    } catch (error) {
      setExpressionError(walidExpressionError);
      return () => 0;
    }
  }, [functionExpression, parameterA]);

  const secondMathFunction = useMemo(() => {
    try {
      const safeExpression = sanitizeExpression(secondFunctionExpression);
      const compiled = (x) => {
        // eslint-disable-next-line no-new-func
        const evaluate = new Function('x', 'a', `return (${safeExpression});`);
        return evaluate(x, parameterA);
      };
      setExpressionError('');
      return compiled;
    } catch (error) {
      setExpressionError(walidExpressionError);
      return () => 0;
    }
  }, [secondFunctionExpression, parameterA]);

  const svgPath = useMemo(() => {
    try {
      return buildSvgPath({
        mathFunction,
        width,
        height,
        offsetX,
        offsetY,
        scale,
      });
    } catch (error) {
      if (typeof setExpressionError === 'function') {
        setExpressionError(walidExpressionError);
      }
      return '';
    }
  }, [mathFunction, offsetX, offsetY, scale, width, height]);

  const secondSvgPath = useMemo(() => {
    try {
      return buildSvgPath({
        mathFunction: secondMathFunction,
        width,
        height,
        offsetX,
        offsetY,
        scale,
      });
    } catch (error) {
      if (typeof setExpressionError === 'function') {
        setExpressionError(walidExpressionError);
      }
      return '';
    }
  }, [secondMathFunction, offsetX, offsetY, scale, width, height]);

  useEffect(() => {
    const updateViewportSize = () => {
      if (!stageRef.current) {
        return;
      }

      const rect = stageRef.current.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    if (stageRef.current) {
      resizeObserver.observe(stageRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const handlePointerDown = (event) => {
    dragState.current = { active: true, lastX: event.clientX, lastY: event.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!dragState.current.active) {
      return;
    }

    const dx = event.clientX - dragState.current.lastX;
    const dy = event.clientY - dragState.current.lastY;

    dragState.current.lastX = event.clientX;
    dragState.current.lastY = event.clientY;

    setOffsetX((prev) => prev + dx);
    setOffsetY((prev) => prev + dy);
  };

  const handlePointerUp = () => {
    dragState.current.active = false;
    setIsDragging(false);
  };

  const handleWheel = (event) => {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.min(10, Math.max(0.1, scale * zoomFactor));
    const scaleRatio = nextScale / scale;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setScale(nextScale);
    setOffsetX((prev) => prev + (mouseX - centerX) * (1 - scaleRatio));
    setOffsetY((prev) => prev + (mouseY - centerY) * (1 - scaleRatio));
  };

  return (
    <div className="app-shell">
      <div
        ref={stageRef}
        className={`grid-stage${isDragging ? ' dragging' : ''}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
        style={{ '--grid-offset-x': `${offsetX}px`, '--grid-offset-y': `${offsetY}px`, '--grid-scale': scale }}
      >
        <div className="center-axis" />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto'
          }}
        >
          <path
            className="function-line"
            d={svgPath}
            stroke={functionColour}
            style={{ stroke: functionColour, '--function-color': functionColour }}
          />
          <path
            className="second-function-line"
            d={secondSvgPath}
            stroke={secondFunctionColour}
            style={{ stroke: secondFunctionColour, '--second-function-color': secondFunctionColour }}
          />
        </svg>
      </div>

      <aside className="function-panel">
        <h2>Графический калькулятор</h2>
        <p>Введите математическую функцию</p>
        <label className="function-label" htmlFor="function-input">
          f(x) =
        </label>

        <input
          id="function-input"
          className="function-input"
          value={functionExpression}
          onChange={(event) => {
            setFunctionExpression(event.target.value);
            checkIfGuessed(mathFunction, secondMathFunction);
          }}
          placeholder="x, x^2, sin(ax), log(a)"
        />

        {expressionError ? <p className="function-error">{expressionError}</p> : null}
        
        <label className="function-slider-row" htmlFor="parameter-a">
          <span>a =</span>
          <input
            id="parameter-a"
            className="function-slider"
            type="range"
            min="-4"
            max="4"
            step="0.1"
            value={parameterA}
            onChange={(event) => {
              setParameterA(Number(event.target.value));
              checkIfGuessed(mathFunction, secondMathFunction);
            }}
          />
          <strong>{parameterA.toFixed(1)}</strong>
        </label>
        <p className="function-hint">Примеры: x^2, x2 + 3, ax, sin(ax), log(a)</p>
      </aside>
    </div>
  );
}

export default App;
