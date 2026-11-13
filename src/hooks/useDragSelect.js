import { useState, useEffect } from 'react';

// 날짜 칸을 마우스로 눌러 끌어서 범위를 고르는 동작을 맡는 훅.
// 이 훅은 "누르고, 끌고, 놓는다"만 안다. 범위를 고른 뒤 무엇을 할지는 쓰는 쪽이 onSelect로 정한다.
//
//   onSelect(start, end): 2칸 이상 고르고 마우스를 놓았을 때 한 번 호출된다. (start <= end 순서로 정렬되어 있음)
//   돌려주는 값: 선택 범위(selectionStart/End), 칸에 붙일 마우스 핸들러, 선택을 지우는 clearSelection
export default function useDragSelect({ onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
        if (selectionStart && selectionEnd && selectionStart !== selectionEnd) {
          const sorted = [selectionStart, selectionEnd].sort();
          onSelect(sorted[0], sorted[1]);
        } else {
          setSelectionStart(null);
          setSelectionEnd(null);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isDragging, selectionStart, selectionEnd, onSelect]);

  const handleMouseDown = (dateString) => {
    setIsDragging(true);
    setSelectionStart(dateString);
    setSelectionEnd(dateString);
  };

  const handleMouseEnter = (dateString) => {
    if (isDragging) setSelectionEnd(dateString);
  };

  // 드래그를 멈추고 선택 표시를 지운다.
  const clearSelection = () => {
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  return { selectionStart, selectionEnd, handleMouseDown, handleMouseEnter, clearSelection };
}
