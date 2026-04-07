import Swal from 'sweetalert2'

export const getSwalSettings = (type: 'default' | 'danger' | 'success' | 'warning' = 'default') => {
  const root = document.documentElement
  const style = getComputedStyle(root)

  const bgColor = style.getPropertyValue('--bg').trim() || '#ffffff'
  const textColor = style.getPropertyValue('--text').trim() || '#000000'
  const accentColor = style.getPropertyValue('--accent').trim() || '#6c63ff'
  const redColor = style.getPropertyValue('--red').trim() || '#f87171'
  const greenColor = style.getPropertyValue('--green').trim() || '#10b981'
  const grayColor = style.getPropertyValue('--bg4').trim() || '#333333'

  let confirmColor = accentColor
  if (type === 'danger') confirmColor = redColor
  if (type === 'success') confirmColor = greenColor

  return {
    background: bgColor,
    color: textColor,
    confirmButtonColor: confirmColor,
    cancelButtonColor: grayColor,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    padding: '1.5rem',
    borderRadius: '16px',
    customClass: {
      popup: 'swal-custom-popup',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn'
    }
  }
}

export const swalInstance = Swal
