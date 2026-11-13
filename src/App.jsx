import { useState, useEffect } from 'react';

import { COLOR_PALETTE } from './constants/colors';
import EditIcon from './components/icons/EditIcon';
import DeleteIcon from './components/icons/DeleteIcon';
import ColorPicker from './components/common/ColorPicker';
import YearSection from './components/calendar/YearSection';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';

export default function App() {
  const [events, setEvents] = useState([]);
  const [dailySchedules, setDailySchedules] = useState({});
  
  const [currentYear, setCurrentYear] = useState(2026);
  const [isWrapMode, setIsWrapMode] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });
  
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyModalDate, setDailyModalDate] = useState(null);
  const [singleDayEventTitle, setSingleDayEventTitle] = useState('');
  const [singleDayEventColor, setSingleDayEventColor] = useState(COLOR_PALETTE[0].value);
  const [tempDaily, setTempDaily] = useState([]);
  
  const [showMoreDate, setShowMoreDate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const savedEvents = localStorage.getItem('planner_events');
    const savedDaily = localStorage.getItem('planner_daily');
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedDaily) setDailySchedules(JSON.parse(savedDaily));
  }, []);

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDragging) {
        setIsDragging(false);
        if (selectionStart && selectionEnd && selectionStart !== selectionEnd) {
          const sorted = [selectionStart, selectionEnd].sort();
          setNewEvent(prev => ({ ...prev, start_date: sorted[0], end_date: sorted[1] }));
          setShowPeriodModal(true);
        } else {
          setSelectionStart(null);
          setSelectionEnd(null);
        }
      }
    };
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isDragging, selectionStart, selectionEnd]);

  const handleMouseDown = (dateString) => {
    setIsDragging(true);
    setSelectionStart(dateString);
    setSelectionEnd(dateString);
  };

  const handleMouseEnter = (dateString) => {
    if (isDragging) setSelectionEnd(dateString);
  };

  const handleAddDailyClick = (e, dateString) => {
    e.stopPropagation();
    setIsDragging(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setDailyModalDate(dateString);
    setSingleDayEventTitle('');
    setSingleDayEventColor(COLOR_PALETTE[0].value);
    loadDailyScheduleData(dateString);
    setShowDailyModal(true);
  };

  const loadDailyScheduleData = (targetDate) => {
    const existingDaily = dailySchedules[targetDate] || [];
    const initialTemp = Array.from({ length: 24 }, (_, hour) => {
      const found = existingDaily.find(d => d.hour === hour);
      return found ? { ...found, color: found.color || COLOR_PALETTE[0].value } : { hour, content: '', is_important: false, color: COLOR_PALETTE[0].value };
    });
    setTempDaily(initialTemp);
  };

  const handleTempDailyChange = (hour, field, value) => {
    setTempDaily(prev => prev.map(item => item.hour === hour ? { ...item, [field]: value } : item));
  };

  const savePeriodEvent = () => {
    if (newEvent.title.trim()) {
      const updatedEvents = [...events, { ...newEvent, id: Date.now() }];
      setEvents(updatedEvents);
      localStorage.setItem('planner_events', JSON.stringify(updatedEvents));
    }
    closePeriodModal();
  };

  const saveDailySchedules = () => {
    if (singleDayEventTitle.trim()) {
      const newSingleEvent = {
        id: Date.now() + Math.random(),
        title: singleDayEventTitle,
        start_date: dailyModalDate,
        end_date: dailyModalDate,
        color: singleDayEventColor
      };
      const updatedEvents = [...events, newSingleEvent];
      setEvents(updatedEvents);
      localStorage.setItem('planner_events', JSON.stringify(updatedEvents));
    }

    const validSchedules = tempDaily.filter(item => item.content.trim() !== '');
    const updatedDaily = { ...dailySchedules, [dailyModalDate]: validSchedules };
    setDailySchedules(updatedDaily);
    localStorage.setItem('planner_daily', JSON.stringify(updatedDaily));
    
    closeDailyModal();
  };

  const closePeriodModal = () => {
    setShowPeriodModal(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setNewEvent({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });
  };

  const closeDailyModal = () => {
    setShowDailyModal(false);
    setDailyModalDate(null);
    setSingleDayEventTitle('');
    setTempDaily([]);
  };

  const openEditModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowEditModal(true);
  };

  const updateEvent = () => {
    if (!selectedEvent.title.trim()) return alert('일정명을 입력해주세요.');
    const updatedEvents = events.map(evt => evt.id === selectedEvent.id ? selectedEvent : evt);
    setEvents(updatedEvents);
    localStorage.setItem('planner_events', JSON.stringify(updatedEvents));
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const openDeleteModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowDeleteModal(true);
  };

  const deleteEvent = () => {
    const updatedEvents = events.filter(evt => evt.id !== selectedEvent.id);
    setEvents(updatedEvents);
    localStorage.setItem('planner_events', JSON.stringify(updatedEvents));
    setShowDeleteModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  // 기준 연도와 그 다음 연도를 동시 렌더링하기 위한 배열
  const displayYears = [currentYear, currentYear + 1];

  // 달력 날짜 칸(DayCell)까지 전달할 값 묶음
  const cellProps = {
    events, dailySchedules,
    selectionStart, selectionEnd,
    onMouseDown: handleMouseDown, onMouseEnter: handleMouseEnter,
    onAddDaily: handleAddDailyClick,
    onEditEvent: openEditModal, onDeleteEvent: openDeleteModal,
    onShowMore: setShowMoreDate,
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <select 
            value={currentYear} 
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value={2026}>2026년 기준</option>
            <option value={2027}>2027년 기준</option>
            <option value={2028}>2028년 기준</option>
          </select>
          <h1 className="text-xl text-gray-600 hidden sm:block">연속 연간 플래너</h1>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md border border-gray-200">
          <button 
            onClick={() => setIsWrapMode(false)} 
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${!isWrapMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            가로 스크롤
          </button>
          <button 
            onClick={() => setIsWrapMode(true)} 
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${isWrapMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            화면 맞춤
          </button>
        </div>
      </div>

      <div className={`border border-gray-200 rounded-lg shadow-inner bg-white relative ${isWrapMode ? '' : 'overflow-x-auto'}`}>
        <div className={`flex flex-col ${isWrapMode ? '' : 'min-w-max'}`}>
          {/* 기준 연도와 다음 연도를 순차적으로 렌더링 */}
          {displayYears.map(year => (
            <YearSection key={year} year={year} isWrapMode={isWrapMode} cellProps={cellProps} />
          ))}
        </div>
      </div>

      {/* --- 기간 일정 등록 모달 --- */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseUp={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">기간 일정 등록</h2>
                <p className="text-sm text-gray-600 mt-1">{newEvent.start_date} ~ {newEvent.end_date}</p>
              </div>
              <button onClick={closePeriodModal} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div>
                <input 
                  type="text" placeholder="일정명 입력" value={newEvent.title} 
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">지정색</label>
                <ColorPicker
                  value={newEvent.color}
                  onChange={(color) => setNewEvent(prev => ({ ...prev, color }))}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={closePeriodModal} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">취소</button>
              <button onClick={savePeriodEvent} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 상세 일정 모달 (종일 + 개별 타임블록) --- */}
      {showDailyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseUp={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">상세 일정 관리</h2>
                <p className="text-sm text-gray-600 mt-1">{dailyModalDate}</p>
              </div>
              <button onClick={closeDailyModal} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex flex-col gap-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">전체(종일) 일정 추가 <span className="font-normal text-gray-400 text-xs ml-1">(선택 사항)</span></h3>
                <div className="flex gap-3 items-center">
                  <input 
                    type="text" placeholder="예: 워크숍 일정" value={singleDayEventTitle} 
                    onChange={(e) => setSingleDayEventTitle(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                  <ColorPicker size="md" value={singleDayEventColor} onChange={setSingleDayEventColor} />
                </div>
              </section>

              <section className="border-t border-gray-100 pt-5">
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">시간대별 개별 일정</h3>
                  <span className="text-[10px] text-gray-500">우측 체크 시 달력 표출</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
                  {tempDaily.map((item) => (
                    <div key={item.hour} className="flex gap-2 items-center bg-white p-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100">
                      <span className="text-xs font-medium text-gray-500 w-10 text-right flex-shrink-0">{String(item.hour).padStart(2, '0')}:00</span>
                      <input 
                        type="text" placeholder="내용 입력" value={item.content}
                        onChange={(e) => handleTempDailyChange(item.hour, 'content', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400 min-w-0"
                      />
                      <ColorPicker size="sm" value={item.color} onChange={(color) => handleTempDailyChange(item.hour, 'color', color)} />
                      <label className="flex items-center gap-1 cursor-pointer w-12 justify-end flex-shrink-0">
                        <input 
                          type="checkbox" checked={item.is_important}
                          onChange={(e) => handleTempDailyChange(item.hour, 'is_important', e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-[10px] text-gray-600 font-medium">주요</span>
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={closeDailyModal} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">취소</button>
              <button onClick={saveDailySchedules} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">통합 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 더보기 모달 --- */}
      {showMoreDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onMouseUp={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900">{showMoreDate} 전체 일정</h3>
              <button onClick={() => setShowMoreDate(null)} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
              {events.filter(e => e.start_date <= showMoreDate && e.end_date >= showMoreDate).map(evt => (
                <div key={evt.id} style={{ backgroundColor: evt.color }} className="text-white text-xs px-2.5 py-1.5 rounded flex justify-between items-center shadow-sm font-medium w-full min-w-0">
                  <span className="truncate flex-1">{evt.title}</span>
                  <div className="flex gap-2 items-center flex-shrink-0 ml-2">
                    <button onClick={() => openEditModal(null, evt)} className="text-white hover:text-gray-200"><EditIcon /></button>
                    <button onClick={() => openDeleteModal(null, evt)} className="text-red-100 hover:text-white"><DeleteIcon /></button>
                  </div>
                </div>
              ))}
              {(dailySchedules[showMoreDate] || []).filter(s => s.is_important).sort((a,b)=>a.hour-b.hour).map((sch, idx) => (
                <div key={idx} className="text-xs text-gray-700 flex gap-2 items-center px-2 py-1.5 bg-gray-50 rounded border border-gray-100 w-full min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sch.color }}></span>
                  <span className="font-semibold text-gray-500 w-9 flex-shrink-0">{String(sch.hour).padStart(2, '0')}:00</span>
                  <span className="truncate flex-1">{sch.content}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- 일정 수정 모달 --- */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onMouseUp={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-gray-900">일정 수정</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">일정명</label>
              <input 
                type="text" value={selectedEvent.title} 
                onChange={(e) => setSelectedEvent(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">시작일</label>
                <input 
                  type="date" value={selectedEvent.start_date} 
                  onChange={(e) => setSelectedEvent(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">종료일</label>
                <input 
                  type="date" value={selectedEvent.end_date} 
                  onChange={(e) => setSelectedEvent(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">지정색</label>
              <ColorPicker
                value={selectedEvent.color}
                onChange={(color) => setSelectedEvent(prev => ({ ...prev, color }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100">삭제</button>
              <div className="flex-1 flex gap-2">
                <button onClick={() => { setShowEditModal(false); setSelectedEvent(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">취소</button>
                <button onClick={updateEvent} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">변경 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 삭제 확인 모달 --- */}
      {showDeleteModal && (
        <DeleteConfirmModal onCancel={() => setShowDeleteModal(false)} onConfirm={deleteEvent} />
      )}
    </div>
  );
}