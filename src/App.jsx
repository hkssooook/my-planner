import { useState } from 'react';

import { COLOR_PALETTE } from './constants/colors';
import { YEAR_RANGE } from './constants/calendar';
import { getCurrentYear, getYearOptions } from './utils/date';
import useDragSelect from './hooks/useDragSelect';
import usePlannerData from './hooks/usePlannerData';
import Header from './components/layout/Header';
import YearSection from './components/calendar/YearSection';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import MoreEventsModal from './components/modals/MoreEventsModal';
import PeriodEventModal from './components/modals/PeriodEventModal';
import EditEventModal from './components/modals/EditEventModal';
import DailyDetailModal from './components/modals/DailyDetailModal';

export default function App() {
  const { events, dailySchedules, addEvent, changeEvent, removeEvent, saveDaySchedule } = usePlannerData();

  // 앱을 연 해(올해)를 한 번 읽어 고정하고, 그 해로 시작한다. 선택 칸의 연도 목록도 이 해를 기준으로 만든다.
  const [thisYear] = useState(getCurrentYear);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const yearOptions = getYearOptions(thisYear, YEAR_RANGE);
  const [isWrapMode, setIsWrapMode] = useState(false);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });

  // 날짜를 끌어서 고르면 기간 일정 등록 팝업을 연다
  const { selectionStart, selectionEnd, handleMouseDown, handleMouseEnter, clearSelection } = useDragSelect({
    onSelect: (start, end) => {
      setNewEvent(prev => ({ ...prev, start_date: start, end_date: end }));
      setShowPeriodModal(true);
    },
  });

  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyModalDate, setDailyModalDate] = useState(null);
  const [dailyFocusHour, setDailyFocusHour] = useState(null); // 시간 일정을 눌러 열었으면 그 시간, 아니면 null
  const [singleDayEventTitle, setSingleDayEventTitle] = useState('');
  const [singleDayEventColor, setSingleDayEventColor] = useState(COLOR_PALETTE[0].value);
  const [tempDaily, setTempDaily] = useState([]);

  const [showMoreDate, setShowMoreDate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 그날의 상세 일정 관리 팝업을 연다. (날짜 칸을 누르거나, 날짜 버튼에서 Enter)
  // hour를 주면(달력에서 시간 일정을 눌렀을 때) 그 시간 줄을 보여 주며 연다.
  const openDailyModal = (e, dateString, hour = null) => {
    e.stopPropagation();
    clearSelection();
    setDailyModalDate(dateString);
    setDailyFocusHour(hour);
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
    if (newEvent.title.trim()) addEvent(newEvent);
    closePeriodModal();
  };

  const saveDailySchedules = () => {
    if (singleDayEventTitle.trim()) {
      addEvent({
        title: singleDayEventTitle,
        start_date: dailyModalDate,
        end_date: dailyModalDate,
        color: singleDayEventColor,
      });
    }

    const validSchedules = tempDaily.filter(item => item.content.trim() !== '');
    saveDaySchedule(dailyModalDate, validSchedules);

    closeDailyModal();
  };

  const closePeriodModal = () => {
    setShowPeriodModal(false);
    clearSelection();
    setNewEvent({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });
  };

  const closeDailyModal = () => {
    setShowDailyModal(false);
    setDailyModalDate(null);
    setDailyFocusHour(null);
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
    changeEvent(selectedEvent);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const openDeleteModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowDeleteModal(true);
  };

  const deleteEvent = () => {
    removeEvent(selectedEvent.id);
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
    onOpenDay: openDailyModal,
    onEditEvent: openEditModal, onDeleteEvent: openDeleteModal,
    onShowMore: setShowMoreDate,
  };

  return (
    <div className="p-4 bg-background min-h-screen">
      <Header
        year={currentYear} onYearChange={setCurrentYear} years={yearOptions}
        isWrapMode={isWrapMode} onWrapModeChange={setIsWrapMode}
      />

      <div className={`border border-border rounded-lg shadow-inner bg-card relative ${isWrapMode ? '' : 'overflow-x-auto'}`}>
        <div className={`flex flex-col ${isWrapMode ? '' : 'min-w-max'}`}>
          {/* 기준 연도와 다음 연도를 순차적으로 렌더링 */}
          {displayYears.map(year => (
            <YearSection key={year} year={year} isWrapMode={isWrapMode} cellProps={cellProps} />
          ))}
        </div>
      </div>

      {/* --- 기간 일정 등록 모달 --- */}
      {showPeriodModal && (
        <PeriodEventModal
          event={newEvent}
          onChange={(changes) => setNewEvent(prev => ({ ...prev, ...changes }))}
          onClose={closePeriodModal}
          onSave={savePeriodEvent}
        />
      )}

      {/* --- 상세 일정 모달 (종일 + 개별 타임블록) --- */}
      {showDailyModal && (
        <DailyDetailModal
          date={dailyModalDate}
          allDayTitle={singleDayEventTitle} allDayColor={singleDayEventColor}
          onAllDayTitleChange={setSingleDayEventTitle} onAllDayColorChange={setSingleDayEventColor}
          slots={tempDaily} onSlotChange={handleTempDailyChange}
          focusHour={dailyFocusHour}
          onSave={saveDailySchedules} onClose={closeDailyModal}
        />
      )}

      {/* --- 더보기 모달 --- */}
      {showMoreDate && (
        <MoreEventsModal
          date={showMoreDate}
          events={events} dailySchedules={dailySchedules}
          onClose={() => setShowMoreDate(null)}
          onEditEvent={(evt) => openEditModal(null, evt)}
          onDeleteEvent={(evt) => openDeleteModal(null, evt)}
        />
      )}

      {/* --- 일정 수정 모달 --- */}
      {showEditModal && selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          onChange={(changes) => setSelectedEvent(prev => ({ ...prev, ...changes }))}
          onSave={updateEvent}
          onClose={() => { setShowEditModal(false); setSelectedEvent(null); }}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* --- 삭제 확인 모달 --- */}
      {showDeleteModal && (
        <DeleteConfirmModal onCancel={() => setShowDeleteModal(false)} onConfirm={deleteEvent} />
      )}
    </div>
  );
}