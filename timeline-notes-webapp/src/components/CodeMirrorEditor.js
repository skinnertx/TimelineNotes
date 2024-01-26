import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

export default function CodeMirrorEditor({initialValue, handleChange}) {
  // local value used by editor to manage state
  const [value, setValue] = React.useState(initialValue);

    // update local value when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

    // update parent state when local value changes
  const onChange = React.useCallback((val, viewUpdate) => {
    setValue(val);
    handleChange(val)
  }, []);

  return <CodeMirror value={value} height="200px" extensions={[javascript({ jsx: true })]} onChange={onChange} />;
}
