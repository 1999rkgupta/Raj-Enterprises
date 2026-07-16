import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import type { RootState } from '../../store/store';
import { hideToast } from '@raj-enterprises/shared-redux';

function ToastContainer() {
  const dispatch = useDispatch();
  const toasts = useSelector((state: RootState) => state.ui.toasts);

  useEffect(() => {
    toasts.forEach((toast) => {
      const duration = toast.duration || 4000;
      const timer = setTimeout(() => {
        dispatch(hideToast(toast.id));
      }, duration);
      return () => clearTimeout(timer);
    });
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => dispatch(hideToast(toast.id))}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
