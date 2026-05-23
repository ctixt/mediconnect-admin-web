import { useEffect, useMemo, useState } from 'react';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

type DashboardPageProps = {
  onLogout: () => void;
};

type AdminModule =
  | 'dashboard'
  | 'usuarios'
  | 'validadores'
  | 'medicamentos'
  | 'solicitudes'
  | 'reportes'
  | 'ajustes';

type UserData = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  phone?: string;
  location?: string;
  accountStatus?: string;
  validatorAuthorized?: boolean;
  validatorStatus?: string;
  validatorType?: string;
  institution?: string;
  professionalLicenseNumber?: string;
  validatorDocumentStatus?: string;
  academicTitlePhotoName?: string;
  passwordLoginEnabled?: boolean;
  accessSupportRequired?: boolean;
  accessSupportNote?: string;
};

type MedicineData = {
  id: string;
  name?: string;
  active?: string;
  mg?: string;
  lot?: string;
  expiration?: string;
  quantity?: string | number;
  barcode?: string;
  medicinePhoto?: string;
  donorName?: string;
  donorType?: string;
  donorPhone?: string;
  donorLocation?: string;
  donationStatus?: string;
  validationStatus?: string;
  adminDisabled?: boolean;
  adminStatus?: string;
};

type RequestData = {
  id: string;
  medicineName?: string;
  medicineActive?: string;
  donorName?: string;
  receiverName?: string;
  receiverPhone?: string;
  requestedQuantity?: string | number;
  urgency?: string;
  requestReason?: string;
  status?: string;
  adminArchived?: boolean;
  evidencePhoto?: string;
  evidenceRequiredApplied?: boolean;
  createdAt?: unknown;
};


type SystemSettings = {
  appName: string;
  adminMessage: string;
  supportEmail: string;
  minExpirationDays: number;
  evidenceRequired: boolean;
  validatorAuthorizationRequired: boolean;
  allowValidatorRegistration: boolean;
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  appName: 'MediConnect',
  adminMessage: 'Sistema operativo correctamente.',
  supportEmail: 'soporte@mediconnect.com',
  minExpirationDays: 30,
  evidenceRequired: true,
  validatorAuthorizationRequired: true,
  allowValidatorRegistration: true,
};

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeModule, setActiveModule] = useState<AdminModule>('dashboard');
  const [loading, setLoading] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [users, setUsers] = useState<UserData[]>([]);
  const [medicines, setMedicines] = useState<MedicineData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<UserData | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('todos');
  const [userStatusFilter, setUserStatusFilter] = useState('todos');

  const [validatorSearch, setValidatorSearch] = useState('');
  const [validatorStatusFilter, setValidatorStatusFilter] =
    useState('pendiente');

  const [medicineSearch, setMedicineSearch] = useState('');
  const [medicineStatusFilter, setMedicineStatusFilter] = useState('todos');

  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('todos');
  const [requestArchiveFilter, setRequestArchiveFilter] = useState('activas');

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(
    DEFAULT_SYSTEM_SETTINGS
  );
  const [settingsDraft, setSettingsDraft] = useState<SystemSettings>(
    DEFAULT_SYSTEM_SETTINGS
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    const content = document.querySelector('.main-content');

    const handleScroll = () => {
      const scrollValue = content instanceof HTMLElement ? content.scrollTop : window.scrollY;
      setShowScrollTop(scrollValue > 320);
    };

    if (content instanceof HTMLElement) {
      content.addEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll);
    }

    handleScroll();

    return () => {
      if (content instanceof HTMLElement) {
        content.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as UserData[];

      setUsers(list);
      setLoading(false);
    });

    const unsubscribeMedicines = onSnapshot(
      collection(db, 'medicines'),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as MedicineData[];

        setMedicines(list);
        setLoading(false);
      }
    );

    const unsubscribeRequests = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as RequestData[];

        setRequests(list);
        setLoading(false);
      }
    );

    const unsubscribeSettings = onSnapshot(
      doc(db, 'settings', 'system'),
      (snapshot) => {
        if (!snapshot.exists()) {
          setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
          setSettingsDraft(DEFAULT_SYSTEM_SETTINGS);
          setSettingsLoading(false);
          return;
        }

        const data = snapshot.data();

        const loadedSettings: SystemSettings = {
          appName: String(data.appName || DEFAULT_SYSTEM_SETTINGS.appName),
          adminMessage: String(
            data.adminMessage || DEFAULT_SYSTEM_SETTINGS.adminMessage
          ),
          supportEmail: String(
            data.supportEmail || DEFAULT_SYSTEM_SETTINGS.supportEmail
          ),
          minExpirationDays: Number(
            data.minExpirationDays ?? DEFAULT_SYSTEM_SETTINGS.minExpirationDays
          ),
          evidenceRequired:
            typeof data.evidenceRequired === 'boolean'
              ? data.evidenceRequired
              : DEFAULT_SYSTEM_SETTINGS.evidenceRequired,
          validatorAuthorizationRequired:
            typeof data.validatorAuthorizationRequired === 'boolean'
              ? data.validatorAuthorizationRequired
              : DEFAULT_SYSTEM_SETTINGS.validatorAuthorizationRequired,
          allowValidatorRegistration:
            typeof data.allowValidatorRegistration === 'boolean'
              ? data.allowValidatorRegistration
              : DEFAULT_SYSTEM_SETTINGS.allowValidatorRegistration,
        };

        setSystemSettings(loadedSettings);
        setSettingsDraft(loadedSettings);
        setSettingsLoading(false);
      },
      (error) => {
        console.log(error);
        setSettingsLoading(false);
      }
    );

    const currentAdminUid = auth.currentUser?.uid;
    let unsubscribeCurrentAdmin: (() => void) | null = null;

    if (currentAdminUid) {
      unsubscribeCurrentAdmin = onSnapshot(
        doc(db, 'users', currentAdminUid),
        (snapshot) => {
          if (!snapshot.exists()) {
            setCurrentAdmin(null);
            return;
          }

          setCurrentAdmin({
            id: snapshot.id,
            ...snapshot.data(),
          } as UserData);
        },
        (error) => {
          console.log(error);
          setCurrentAdmin(null);
        }
      );
    }

    return () => {
      unsubscribeUsers();
      unsubscribeMedicines();
      unsubscribeRequests();
      unsubscribeSettings();
      if (unsubscribeCurrentAdmin) unsubscribeCurrentAdmin();
    };
  }, []);

  const totalUsers = users.length;
  const donantes = users.filter((user) => user.role === 'donante').length;
  const receptores = users.filter((user) => user.role === 'receptor').length;
  const validadores = users.filter((user) => user.role === 'validador').length;
  const admins = users.filter((user) => user.role === 'admin').length;

  const activeUsers = users.filter((user) => {
    const status = String(user.accountStatus || 'activo').toLowerCase();
    return status === 'activo';
  }).length;

  const suspendedUsers = users.filter((user) => {
    const status = String(user.accountStatus || 'activo').toLowerCase();
    return ['suspendido', 'desactivado', 'bloqueado'].includes(status);
  }).length;

  const validatorUsers = users.filter((user) => user.role === 'validador');

  const pendingValidators = validatorUsers.filter(
    (user) =>
      user.validatorAuthorized !== true &&
      String(user.validatorStatus || 'pendiente').toLowerCase() === 'pendiente'
  ).length;

  const authorizedValidators = validatorUsers.filter(
    (user) =>
      user.validatorAuthorized === true &&
      String(user.validatorStatus || '').toLowerCase() === 'autorizado'
  ).length;

  const rejectedValidators = validatorUsers.filter(
    (user) => String(user.validatorStatus || '').toLowerCase() === 'rechazado'
  ).length;

  const supportRequiredUsers = users.filter(
    (user) => user.accessSupportRequired === true
  ).length;

  const totalMedicines = medicines.length;
  const publishedMedicines = medicines.filter(
    (medicine) => medicine.donationStatus === 'publicado'
  ).length;
  const disabledMedicines = medicines.filter(
    (medicine) => medicine.adminDisabled === true
  ).length;
  const depletedMedicines = medicines.filter(
    (medicine) => medicine.donationStatus === 'agotado'
  ).length;
  const pendingValidationMedicines = medicines.filter(
    (medicine) => medicine.validationStatus === 'pendiente'
  ).length;

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(
    (request) => request.status === 'pendiente'
  ).length;
  const approvedRequests = requests.filter(
    (request) => request.status === 'aprobado'
  ).length;
  const rejectedRequests = requests.filter(
    (request) => request.status === 'rechazado'
  ).length;
  const deliveredRequests = requests.filter(
    (request) => request.status === 'entregado'
  ).length;
  const archivedRequests = requests.filter(
    (request) => request.adminArchived === true
  ).length;

  const parseExpirationDate = (value?: string) => {
    if (!value) return null;

    const cleanValue = String(value).trim();

    if (!cleanValue) return null;

    const isoMatch = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(cleanValue);
    date.setHours(0, 0, 0, 0);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getDaysUntilExpiration = (medicine: MedicineData) => {
    const expirationDate = parseExpirationDate(medicine.expiration);

    if (!expirationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const getExpirationStatus = (medicine: MedicineData) => {
    const days = getDaysUntilExpiration(medicine);

    if (days === null) return 'fecha_invalida';
    if (days < 0) return 'vencido';
    if (days <= 7) return 'por_vencer_7';
    if (days <= 30) return 'por_vencer_30';

    return 'vigente';
  };

  const getExpirationLabel = (medicine: MedicineData) => {
    const days = getDaysUntilExpiration(medicine);
    const status = getExpirationStatus(medicine);

    if (status === 'fecha_invalida') return 'Fecha inválida';
    if (status === 'vencido') return `Vencido hace ${Math.abs(days || 0)} día(s)`;
    if (status === 'por_vencer_7') return `Vence en ${days} día(s)`;
    if (status === 'por_vencer_30') return `Vence en ${days} día(s)`;

    return 'Vigente';
  };

  const expiredMedicines = medicines.filter(
    (medicine) =>
      medicine.adminDisabled !== true &&
      getExpirationStatus(medicine) === 'vencido'
  ).length;

  const expiring30Medicines = medicines.filter((medicine) => {
    const days = getDaysUntilExpiration(medicine);

    return (
      medicine.adminDisabled !== true &&
      days !== null &&
      days >= 0 &&
      days <= 30
    );
  }).length;

  const invalidExpirationMedicines = medicines.filter(
    (medicine) =>
      medicine.adminDisabled !== true &&
      getExpirationStatus(medicine) === 'fecha_invalida'
  ).length;

  const criticalMedicines =
    expiredMedicines + expiring30Medicines + invalidExpirationMedicines;

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const status = String(user.accountStatus || 'activo').toLowerCase();

      const matchesSearch =
        !search ||
        String(user.fullName || '').toLowerCase().includes(search) ||
        String(user.email || '').toLowerCase().includes(search) ||
        String(user.phone || '').toLowerCase().includes(search) ||
        String(user.location || '').toLowerCase().includes(search);

      const matchesRole =
        userRoleFilter === 'todos' || user.role === userRoleFilter;

      const matchesStatus =
        userStatusFilter === 'todos' ||
        (userStatusFilter === 'activo' && status === 'activo') ||
        (userStatusFilter === 'suspendido' &&
          ['suspendido', 'desactivado', 'bloqueado'].includes(status)) ||
        (userStatusFilter === 'soporte' &&
          user.accessSupportRequired === true);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const filteredValidators = useMemo(() => {
    const search = validatorSearch.trim().toLowerCase();

    return validatorUsers.filter((validator) => {
      const status = String(
        validator.validatorStatus || 'pendiente'
      ).toLowerCase();

      const matchesSearch =
        !search ||
        String(validator.fullName || '').toLowerCase().includes(search) ||
        String(validator.email || '').toLowerCase().includes(search) ||
        String(validator.phone || '').toLowerCase().includes(search) ||
        String(validator.location || '').toLowerCase().includes(search) ||
        String(validator.institution || '').toLowerCase().includes(search) ||
        String(validator.professionalLicenseNumber || '')
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        validatorStatusFilter === 'todos' ||
        status === validatorStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [validatorUsers, validatorSearch, validatorStatusFilter]);

  const filteredMedicines = useMemo(() => {
    const search = medicineSearch.trim().toLowerCase();

    return medicines.filter((medicine) => {
      const isDisabled = medicine.adminDisabled === true;
      const expirationStatus = getExpirationStatus(medicine);
      const days = getDaysUntilExpiration(medicine);

      const matchesSearch =
        !search ||
        String(medicine.name || '').toLowerCase().includes(search) ||
        String(medicine.active || '').toLowerCase().includes(search) ||
        String(medicine.lot || '').toLowerCase().includes(search) ||
        String(medicine.donorName || '').toLowerCase().includes(search) ||
        String(medicine.donorLocation || '').toLowerCase().includes(search) ||
        String(medicine.barcode || '').toLowerCase().includes(search);

      const matchesStatus =
        medicineStatusFilter === 'todos' ||
        (medicineStatusFilter === 'activo' && !isDisabled) ||
        (medicineStatusFilter === 'desactivado' && isDisabled) ||
        (medicineStatusFilter === 'publicado' &&
          medicine.donationStatus === 'publicado') ||
        (medicineStatusFilter === 'agotado' &&
          medicine.donationStatus === 'agotado') ||
        (medicineStatusFilter === 'pendiente' &&
          medicine.validationStatus === 'pendiente') ||
        (medicineStatusFilter === 'vencido' &&
          expirationStatus === 'vencido') ||
        (medicineStatusFilter === 'por_vencer_30' &&
          days !== null &&
          days >= 0 &&
          days <= 30) ||
        (medicineStatusFilter === 'fecha_invalida' &&
          expirationStatus === 'fecha_invalida');

      return matchesSearch && matchesStatus;
    });
  }, [medicines, medicineSearch, medicineStatusFilter]);

  const filteredRequests = useMemo(() => {
    const search = requestSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const isArchived = request.adminArchived === true;

      const matchesSearch =
        !search ||
        String(request.medicineName || '').toLowerCase().includes(search) ||
        String(request.medicineActive || '').toLowerCase().includes(search) ||
        String(request.donorName || '').toLowerCase().includes(search) ||
        String(request.receiverName || '').toLowerCase().includes(search) ||
        String(request.receiverPhone || '').toLowerCase().includes(search) ||
        String(request.requestReason || '').toLowerCase().includes(search) ||
        String(request.urgency || '').toLowerCase().includes(search);

      const matchesStatus =
        requestStatusFilter === 'todos' || request.status === requestStatusFilter;

      const matchesArchive =
        requestArchiveFilter === 'todas' ||
        (requestArchiveFilter === 'activas' && !isArchived) ||
        (requestArchiveFilter === 'archivadas' && isArchived);

      return matchesSearch && matchesStatus && matchesArchive;
    });
  }, [requests, requestSearch, requestStatusFilter, requestArchiveFilter]);


  const openUsersModule = (roleFilter = 'todos', statusFilter = 'todos') => {
    setActiveModule('usuarios');
    setUserSearch('');
    setUserRoleFilter(roleFilter);
    setUserStatusFilter(statusFilter);
  };

  const openValidatorsModule = (statusFilter = 'todos') => {
    setActiveModule('validadores');
    setValidatorSearch('');
    setValidatorStatusFilter(statusFilter);
  };

  const openMedicinesModule = (statusFilter = 'todos') => {
    setActiveModule('medicamentos');
    setMedicineSearch('');
    setMedicineStatusFilter(statusFilter);
  };

  const openRequestsModule = (
    statusFilter = 'todos',
    archiveFilter = 'activas'
  ) => {
    setActiveModule('solicitudes');
    setRequestSearch('');
    setRequestStatusFilter(statusFilter);
    setRequestArchiveFilter(archiveFilter);
  };

  const logout = async () => {
    await signOut(auth);
    onLogout();
  };

  const authorizeValidator = async (validator: UserData) => {
    const confirmAction = window.confirm(
      `¿Deseas autorizar a ${
        validator.fullName || validator.email || 'este usuario'
      } como validador?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'users', validator.id), {
        validatorAuthorized: true,
        validatorStatus: 'autorizado',
        validatorDocumentStatus: 'aprobado',
        validatorAuthorizedAt: new Date(),
        validatorAuthorizedBy: auth.currentUser?.uid || null,
        validatorRejectedAt: null,
        validatorRejectedBy: null,
        accountStatus: 'activo',
      });

      window.alert('Validador autorizado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo autorizar al validador.');
    }
  };

  const rejectValidator = async (validator: UserData) => {
    const confirmAction = window.confirm(
      `¿Deseas rechazar la autorización de ${
        validator.fullName || validator.email || 'este usuario'
      }?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'users', validator.id), {
        validatorAuthorized: false,
        validatorStatus: 'rechazado',
        validatorDocumentStatus: 'rechazado',
        validatorRejectedAt: new Date(),
        validatorRejectedBy: auth.currentUser?.uid || null,
        validatorAuthorizedAt: null,
        validatorAuthorizedBy: null,
      });

      window.alert('Validador rechazado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo rechazar al validador.');
    }
  };

  const disableMedicine = async (medicine: MedicineData) => {
    const confirmAction = window.confirm(
      `¿Deseas desactivar ${
        medicine.name || 'este medicamento'
      }? Ya no debería mostrarse como disponible para receptores.`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'medicines', medicine.id), {
        adminDisabled: true,
        adminStatus: 'desactivado',
        adminDisabledAt: new Date(),
        adminDisabledBy: auth.currentUser?.uid || null,
        donationStatusBeforeDisabled: medicine.donationStatus || null,
      });

      window.alert('Medicamento desactivado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo desactivar el medicamento.');
    }
  };

  const reactivateMedicine = async (medicine: MedicineData) => {
    const confirmAction = window.confirm(
      `¿Deseas reactivar ${medicine.name || 'este medicamento'}?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'medicines', medicine.id), {
        adminDisabled: false,
        adminStatus: 'activo',
        adminReactivatedAt: new Date(),
        adminReactivatedBy: auth.currentUser?.uid || null,
      });

      window.alert('Medicamento reactivado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo reactivar el medicamento.');
    }
  };

  const archiveRequest = async (request: RequestData) => {
    const confirmAction = window.confirm(
      `¿Deseas archivar la solicitud de ${
        request.medicineName || 'este medicamento'
      }? Se ocultará del historial activo, pero conservará trazabilidad.`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'requests', request.id), {
        adminArchived: true,
        adminArchivedAt: new Date(),
        adminArchivedBy: auth.currentUser?.uid || null,
      });

      window.alert('Solicitud archivada correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo archivar la solicitud.');
    }
  };

  const restoreRequest = async (request: RequestData) => {
    const confirmAction = window.confirm(
      `¿Deseas restaurar la solicitud de ${
        request.medicineName || 'este medicamento'
      }?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'requests', request.id), {
        adminArchived: false,
        adminRestoredAt: new Date(),
        adminRestoredBy: auth.currentUser?.uid || null,
      });

      window.alert('Solicitud restaurada correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo restaurar la solicitud.');
    }
  };


  const suspendUser = async (user: UserData) => {
    if (user.id === auth.currentUser?.uid) {
      window.alert('No puedes suspender tu propia cuenta administrativa.');
      return;
    }

    const confirmAction = window.confirm(
      `¿Deseas suspender a ${user.fullName || user.email || 'este usuario'}? El usuario no debería poder operar normalmente mientras esté suspendido.`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        accountStatus: 'suspendido',
        suspendedAt: new Date(),
        suspendedBy: auth.currentUser?.uid || null,
      });

      window.alert('Usuario suspendido correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo suspender el usuario.');
    }
  };

  const reactivateUser = async (user: UserData) => {
    const confirmAction = window.confirm(
      `¿Deseas reactivar a ${user.fullName || user.email || 'este usuario'}?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        accountStatus: 'activo',
        reactivatedAt: new Date(),
        reactivatedBy: auth.currentUser?.uid || null,
      });

      window.alert('Usuario reactivado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo reactivar el usuario.');
    }
  };

  const changeUserRole = async (user: UserData, newRole: string) => {
    if (!newRole || newRole === user.role) return;

    if (user.id === auth.currentUser?.uid && newRole !== 'admin') {
      window.alert('No puedes quitarte a ti mismo el rol de administrador.');
      return;
    }

    const confirmAction = window.confirm(
      `¿Deseas cambiar el rol de ${user.fullName || user.email || 'este usuario'} a ${getRoleLabel(newRole)}?`
    );

    if (!confirmAction) return;

    try {
      const extraValidatorData =
        newRole === 'validador'
          ? {
              validatorAuthorized: user.validatorAuthorized === true,
              validatorStatus: user.validatorStatus || 'pendiente',
            }
          : {};

      await updateDoc(doc(db, 'users', user.id), {
        role: newRole,
        roleUpdatedAt: new Date(),
        roleUpdatedBy: auth.currentUser?.uid || null,
        ...extraValidatorData,
      });

      window.alert('Rol actualizado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo cambiar el rol del usuario.');
    }
  };

  const markUserNeedsSupport = async (user: UserData) => {
    const note = window.prompt(
      'Escribe una observación breve para el soporte de acceso:',
      user.accessSupportNote || 'Usuario requiere apoyo para recuperar o actualizar su acceso.'
    );

    if (note === null) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        accessSupportRequired: true,
        accessSupportNote: note.trim() || 'Usuario requiere soporte de acceso.',
        accessSupportUpdatedAt: new Date(),
        accessSupportUpdatedBy: auth.currentUser?.uid || null,
      });

      window.alert('Usuario marcado como requiere soporte.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo marcar el soporte del usuario.');
    }
  };

  const markUserSupportResolved = async (user: UserData) => {
    const confirmAction = window.confirm(
      `¿Deseas marcar como atendido el soporte de ${user.fullName || user.email || 'este usuario'}?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        accessSupportRequired: false,
        accessSupportResolvedAt: new Date(),
        accessSupportResolvedBy: auth.currentUser?.uid || null,
      });

      window.alert('Soporte marcado como atendido.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo actualizar el soporte del usuario.');
    }
  };

  const sendUserPasswordReset = async (user: UserData) => {
    if (!user.email) {
      window.alert('Este usuario no tiene correo registrado.');
      return;
    }

    const confirmAction = window.confirm(
      `¿Deseas enviar un correo de restablecimiento de contraseña a ${user.email}?`
    );

    if (!confirmAction) return;

    try {
      await sendPasswordResetEmail(auth, user.email);

      await updateDoc(doc(db, 'users', user.id), {
        lastPasswordResetSentAt: new Date(),
        lastPasswordResetSentBy: auth.currentUser?.uid || null,
        accessSupportRequired: true,
        accessSupportNote: 'Se envió correo de restablecimiento de contraseña desde administración web.',
      });

      window.alert('Correo de restablecimiento enviado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo enviar el correo de restablecimiento.');
    }
  };

  const deleteMedicine = async (medicine: MedicineData) => {
    const confirmAction = window.confirm(
      `¿Deseas eliminar definitivamente ${medicine.name || 'este medicamento'}? Esta acción debe usarse solo si el registro fue creado por error.`
    );

    if (!confirmAction) return;

    try {
      await deleteDoc(doc(db, 'medicines', medicine.id));
      window.alert('Medicamento eliminado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo eliminar el medicamento.');
    }
  };

  const updateRequestStatus = async (request: RequestData, newStatus: string) => {
    if (!newStatus || newStatus === request.status) return;

    const confirmAction = window.confirm(
      `¿Deseas cambiar el estado de la solicitud de ${request.medicineName || 'este medicamento'} a ${getRequestStatusLabel(newStatus)}?`
    );

    if (!confirmAction) return;

    try {
      await updateDoc(doc(db, 'requests', request.id), {
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: auth.currentUser?.uid || null,
      });

      window.alert('Estado de solicitud actualizado correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo actualizar el estado de la solicitud.');
    }
  };

  const deleteRequest = async (request: RequestData) => {
    const confirmAction = window.confirm(
      `¿Deseas eliminar definitivamente la solicitud de ${request.medicineName || 'este medicamento'}? Se recomienda archivar antes que eliminar.`
    );

    if (!confirmAction) return;

    try {
      await deleteDoc(doc(db, 'requests', request.id));
      window.alert('Solicitud eliminada correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudo eliminar la solicitud.');
    }
  };


  const saveSystemSettings = async () => {
    if (!settingsDraft.appName.trim()) {
      window.alert('El nombre del sistema no puede quedar vacío.');
      return;
    }

    if (settingsDraft.minExpirationDays < 1) {
      window.alert('Los días mínimos antes del vencimiento deben ser mayores a 0.');
      return;
    }

    try {
      setSettingsSaving(true);

      await setDoc(
        doc(db, 'settings', 'system'),
        {
          appName: settingsDraft.appName.trim(),
          adminMessage:
            settingsDraft.adminMessage.trim() ||
            'Sistema operativo correctamente.',
          supportEmail:
            settingsDraft.supportEmail.trim() || 'soporte@mediconnect.com',
          minExpirationDays: Number(settingsDraft.minExpirationDays),
          evidenceRequired: settingsDraft.evidenceRequired,
          validatorAuthorizationRequired:
            settingsDraft.validatorAuthorizationRequired,
          allowValidatorRegistration:
            settingsDraft.allowValidatorRegistration,
          updatedAt: new Date(),
          updatedBy: auth.currentUser?.uid || null,
        },
        { merge: true }
      );

      window.alert('Ajustes del sistema guardados correctamente.');
    } catch (error) {
      console.log(error);
      window.alert('No se pudieron guardar los ajustes del sistema.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetSettingsDraft = () => {
    setSettingsDraft(systemSettings);
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'donante') return 'Donante';
    if (role === 'receptor') return 'Receptor';
    if (role === 'validador') return 'Validador';
    if (role === 'admin') return 'Administrador';
    return 'Sin rol';
  };

  const getStatusLabel = (status?: string) => {
    const cleanStatus = String(status || 'activo').toLowerCase();

    if (cleanStatus === 'activo') return 'Activo';
    if (cleanStatus === 'suspendido') return 'Suspendido';
    if (cleanStatus === 'desactivado') return 'Desactivado';
    if (cleanStatus === 'bloqueado') return 'Bloqueado';

    return cleanStatus;
  };

  const getValidatorStatusLabel = (status?: string) => {
    const cleanStatus = String(status || 'pendiente').toLowerCase();

    if (cleanStatus === 'pendiente') return 'Pendiente';
    if (cleanStatus === 'autorizado') return 'Autorizado';
    if (cleanStatus === 'rechazado') return 'Rechazado';

    return cleanStatus;
  };

  const getRequestStatusLabel = (status?: string) => {
    const cleanStatus = String(status || 'pendiente').toLowerCase();

    if (cleanStatus === 'pendiente') return 'Pendiente';
    if (cleanStatus === 'aprobado') return 'Aprobada';
    if (cleanStatus === 'rechazado') return 'Rechazada';
    if (cleanStatus === 'entregado') return 'Entregada';
    if (cleanStatus === 'recibido') return 'Recibida';

    return cleanStatus;
  };

  const getEvidenceText = (request: RequestData) => {
    if (request.evidencePhoto) return 'Sí adjuntó evidencia';
    if (request.evidenceRequiredApplied === true) return 'Requerida, no adjuntada';
    return 'No adjuntó';
  };

  const getAdminDisplayName = () => {
    const fullName = String(currentAdmin?.fullName || '').trim();

    if (fullName) return fullName.split(' ')[0];

    const emailName = String(currentAdmin?.email || auth.currentUser?.email || '')
      .split('@')[0]
      .trim();

    return emailName || 'Administrador';
  };

  const getAdminFullName = () => {
    return (
      String(currentAdmin?.fullName || '').trim() ||
      auth.currentUser?.email ||
      'Administrador'
    );
  };

  const getAdminInitial = () => {
    return getAdminDisplayName().charAt(0).toUpperCase() || 'A';
  };

  const getFormattedToday = () => {
    return new Intl.DateTimeFormat('es-GT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  };

  const scrollToTop = () => {
    const content = document.querySelector('.main-content');

    if (content instanceof HTMLElement) {
      content.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getDashboardGreeting = () => {
    if (activeModule === 'dashboard') {
      return `Hola, ${getAdminDisplayName()}`;
    }

    return getModuleTitle();
  };

  const getModuleTitle = () => {
    if (activeModule === 'dashboard') return 'Panel administrativo';
    if (activeModule === 'usuarios') return 'Usuarios del sistema';
    if (activeModule === 'validadores') return 'Validadores';
    if (activeModule === 'medicamentos') return 'Medicamentos';
    if (activeModule === 'solicitudes') return 'Solicitudes';
    if (activeModule === 'reportes') return 'Reportes';
    if (activeModule === 'ajustes') return 'Ajustes del sistema';
    return 'Panel administrativo';
  };

  const getModuleDescription = () => {
    if (activeModule === 'dashboard') {
      return 'Resumen general del sistema de trazabilidad y donación de medicamentos.';
    }

    if (activeModule === 'usuarios') {
      return 'Consulta de usuarios, roles, estados de cuenta y datos de contacto.';
    }

    if (activeModule === 'validadores') {
      return 'Revisión y autorización de validadores registrados en MediConnect.';
    }

    if (activeModule === 'medicamentos') {
      return 'Control administrativo del inventario, vencimientos y estado de medicamentos.';
    }

    if (activeModule === 'solicitudes') {
      return 'Control administrativo del historial de solicitudes, evidencias y entregas.';
    }

    if (activeModule === 'reportes') {
      return 'Generación de reportes administrativos para impresión o guardado en PDF desde el navegador.';
    }

    if (activeModule === 'ajustes') {
      return 'Configuración general del sistema, reglas operativas y mensajes administrativos.';
    }

    return '';
  };

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="loading-box">Cargando panel administrativo...</div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">+</div>
          <h2>MediConnect</h2>
          <p>Admin Web</p>
        </div>

        <nav className="sidebar-nav">
          <SidebarButton
            title="Dashboard"
            active={activeModule === 'dashboard'}
            onClick={() => setActiveModule('dashboard')}
          />

          <SidebarButton
            title="Usuarios"
            active={activeModule === 'usuarios'}
            onClick={() => setActiveModule('usuarios')}
            badge={supportRequiredUsers}
          />

          <SidebarButton
            title="Validadores"
            active={activeModule === 'validadores'}
            onClick={() => setActiveModule('validadores')}
            badge={pendingValidators}
          />

          <SidebarButton
            title="Medicamentos"
            active={activeModule === 'medicamentos'}
            onClick={() => setActiveModule('medicamentos')}
            badge={criticalMedicines}
          />

          <SidebarButton
            title="Solicitudes"
            active={activeModule === 'solicitudes'}
            onClick={() => setActiveModule('solicitudes')}
            badge={pendingRequests}
          />

          <SidebarButton
            title="Reportes"
            active={activeModule === 'reportes'}
            onClick={() => setActiveModule('reportes')}
          />

          <SidebarButton
            title="Ajustes"
            active={activeModule === 'ajustes'}
            onClick={() => setActiveModule('ajustes')}
          />
        </nav>

        <div className="sidebar-footer">
          <span>Sesión protegida</span>
          <small>Firebase Auth</small>
        </div>
      </aside>

      <section className={`main-content ${compactView ? 'compact-view' : ''}`}>
        <header className="topbar enhanced-topbar">
          <div className="topbar-title">
            <span className="topbar-eyebrow">MediConnect Admin</span>
            <h1>{getDashboardGreeting()}</h1>
            <p>
              {activeModule === 'dashboard'
                ? `${getModuleDescription()} Hoy es ${getFormattedToday()}.`
                : getModuleDescription()}
            </p>
          </div>

          <div className="admin-session-card">
            <div className="admin-avatar-small">{getAdminInitial()}</div>

            <div className="admin-session-info">
              <strong>{getAdminFullName()}</strong>
              <span>Administrador conectado</span>
            </div>

            <button className="topbar-logout-button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>

          <div className="topbar-tools">
            {activeModule !== 'dashboard' && (
              <button
                type="button"
                className="topbar-tool-button"
                onClick={() => setActiveModule('dashboard')}
              >
                Volver al dashboard
              </button>
            )}

            <button
              type="button"
              className={`topbar-tool-button ${compactView ? 'active' : ''}`}
              onClick={() => setCompactView(!compactView)}
            >
              {compactView ? 'Vista cómoda' : 'Vista compacta'}
            </button>
          </div>

          <div className="topbar-actions topbar-alerts">
            {pendingValidators > 0 && (
              <button
                className="warning-pill"
                onClick={() => {
                  setActiveModule('validadores');
                  setValidatorStatusFilter('pendiente');
                }}
              >
                {pendingValidators} validador(es) pendiente(s)
              </button>
            )}

            {criticalMedicines > 0 && (
              <button
                className="support-pill"
                onClick={() => {
                  setActiveModule('medicamentos');
                  setMedicineStatusFilter('por_vencer_30');
                }}
              >
                {criticalMedicines} medicamento(s) críticos
              </button>
            )}

            {supportRequiredUsers > 0 && (
              <button
                className="support-pill"
                onClick={() => {
                  setActiveModule('usuarios');
                  setUserStatusFilter('soporte');
                }}
              >
                {supportRequiredUsers} usuario(s) con soporte
              </button>
            )}
          </div>
        </header>

        <ModuleQuickSummary
          activeModule={activeModule}
          totalUsers={totalUsers}
          totalMedicines={totalMedicines}
          totalRequests={totalRequests}
          pendingValidators={pendingValidators}
          criticalMedicines={criticalMedicines}
          supportRequiredUsers={supportRequiredUsers}
          pendingRequests={pendingRequests}
          openUsersModule={openUsersModule}
          openValidatorsModule={openValidatorsModule}
          openMedicinesModule={openMedicinesModule}
          openRequestsModule={openRequestsModule}
        />

        <section key={activeModule} className="module-transition">
        {activeModule === 'dashboard' && (
          <DashboardModule
            totalUsers={totalUsers}
            totalMedicines={totalMedicines}
            totalRequests={totalRequests}
            pendingValidators={pendingValidators}
            donantes={donantes}
            receptores={receptores}
            validadores={validadores}
            admins={admins}
            publishedMedicines={publishedMedicines}
            disabledMedicines={disabledMedicines}
            pendingRequests={pendingRequests}
            approvedRequests={approvedRequests}
            deliveredRequests={deliveredRequests}
            openUsersModule={openUsersModule}
            openValidatorsModule={openValidatorsModule}
            openMedicinesModule={openMedicinesModule}
            openRequestsModule={openRequestsModule}
          />
        )}

        {activeModule === 'usuarios' && (
          <UsersModule
            totalUsers={totalUsers}
            activeUsers={activeUsers}
            suspendedUsers={suspendedUsers}
            supportRequiredUsers={supportRequiredUsers}
            filteredUsers={filteredUsers}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userRoleFilter={userRoleFilter}
            setUserRoleFilter={setUserRoleFilter}
            userStatusFilter={userStatusFilter}
            setUserStatusFilter={setUserStatusFilter}
            getRoleLabel={getRoleLabel}
            getStatusLabel={getStatusLabel}
            suspendUser={suspendUser}
            reactivateUser={reactivateUser}
            changeUserRole={changeUserRole}
            markUserNeedsSupport={markUserNeedsSupport}
            markUserSupportResolved={markUserSupportResolved}
            sendUserPasswordReset={sendUserPasswordReset}
          />
        )}

        {activeModule === 'validadores' && (
          <ValidatorsModule
            totalValidators={validadores}
            pendingValidators={pendingValidators}
            authorizedValidators={authorizedValidators}
            rejectedValidators={rejectedValidators}
            filteredValidators={filteredValidators}
            validatorSearch={validatorSearch}
            setValidatorSearch={setValidatorSearch}
            validatorStatusFilter={validatorStatusFilter}
            setValidatorStatusFilter={setValidatorStatusFilter}
            getValidatorStatusLabel={getValidatorStatusLabel}
            authorizeValidator={authorizeValidator}
            rejectValidator={rejectValidator}
          />
        )}

        {activeModule === 'medicamentos' && (
          <MedicinesModule
            totalMedicines={totalMedicines}
            publishedMedicines={publishedMedicines}
            disabledMedicines={disabledMedicines}
            depletedMedicines={depletedMedicines}
            pendingValidationMedicines={pendingValidationMedicines}
            expiredMedicines={expiredMedicines}
            expiring30Medicines={expiring30Medicines}
            invalidExpirationMedicines={invalidExpirationMedicines}
            filteredMedicines={filteredMedicines}
            medicineSearch={medicineSearch}
            setMedicineSearch={setMedicineSearch}
            medicineStatusFilter={medicineStatusFilter}
            setMedicineStatusFilter={setMedicineStatusFilter}
            getExpirationStatus={getExpirationStatus}
            getExpirationLabel={getExpirationLabel}
            disableMedicine={disableMedicine}
            reactivateMedicine={reactivateMedicine}
            deleteMedicine={deleteMedicine}
          />
        )}

        {activeModule === 'solicitudes' && (
          <RequestsModule
            totalRequests={totalRequests}
            pendingRequests={pendingRequests}
            approvedRequests={approvedRequests}
            rejectedRequests={rejectedRequests}
            deliveredRequests={deliveredRequests}
            archivedRequests={archivedRequests}
            filteredRequests={filteredRequests}
            requestSearch={requestSearch}
            setRequestSearch={setRequestSearch}
            requestStatusFilter={requestStatusFilter}
            setRequestStatusFilter={setRequestStatusFilter}
            requestArchiveFilter={requestArchiveFilter}
            setRequestArchiveFilter={setRequestArchiveFilter}
            getRequestStatusLabel={getRequestStatusLabel}
            getEvidenceText={getEvidenceText}
            archiveRequest={archiveRequest}
            restoreRequest={restoreRequest}
            updateRequestStatus={updateRequestStatus}
            deleteRequest={deleteRequest}
          />
        )}

        {activeModule === 'reportes' && (
          <ReportsModule
            users={users}
            medicines={medicines}
            requests={requests}
            validatorUsers={validatorUsers}
            totalUsers={totalUsers}
            totalMedicines={totalMedicines}
            totalRequests={totalRequests}
            pendingValidators={pendingValidators}
            authorizedValidators={authorizedValidators}
            rejectedValidators={rejectedValidators}
            supportRequiredUsers={supportRequiredUsers}
            publishedMedicines={publishedMedicines}
            disabledMedicines={disabledMedicines}
            expiredMedicines={expiredMedicines}
            expiring30Medicines={expiring30Medicines}
            invalidExpirationMedicines={invalidExpirationMedicines}
            pendingRequests={pendingRequests}
            approvedRequests={approvedRequests}
            rejectedRequests={rejectedRequests}
            deliveredRequests={deliveredRequests}
            archivedRequests={archivedRequests}
            getRoleLabel={getRoleLabel}
            getStatusLabel={getStatusLabel}
            getValidatorStatusLabel={getValidatorStatusLabel}
            getRequestStatusLabel={getRequestStatusLabel}
            getExpirationLabel={getExpirationLabel}
          />
        )}

        {activeModule === 'ajustes' && (
          <SettingsModule
            systemSettings={systemSettings}
            settingsDraft={settingsDraft}
            setSettingsDraft={setSettingsDraft}
            settingsLoading={settingsLoading}
            settingsSaving={settingsSaving}
            saveSystemSettings={saveSystemSettings}
            resetSettingsDraft={resetSettingsDraft}
          />
        )}
        </section>

        {showScrollTop && (
          <button type="button" className="scroll-top-button" onClick={scrollToTop}>
            ↑
          </button>
        )}
      </section>
    </main>
  );
}


function ModuleQuickSummary({
  activeModule,
  totalUsers,
  totalMedicines,
  totalRequests,
  pendingValidators,
  criticalMedicines,
  supportRequiredUsers,
  pendingRequests,
  openUsersModule,
  openValidatorsModule,
  openMedicinesModule,
  openRequestsModule,
}: {
  activeModule: AdminModule;
  totalUsers: number;
  totalMedicines: number;
  totalRequests: number;
  pendingValidators: number;
  criticalMedicines: number;
  supportRequiredUsers: number;
  pendingRequests: number;
  openUsersModule: (roleFilter?: string, statusFilter?: string) => void;
  openValidatorsModule: (statusFilter?: string) => void;
  openMedicinesModule: (statusFilter?: string) => void;
  openRequestsModule: (statusFilter?: string, archiveFilter?: string) => void;
}) {
  const getSummaryContent = () => {
    if (activeModule === 'usuarios') {
      return {
        tone: 'blue',
        title: 'Gestión de usuarios',
        text: 'Administra roles, soporte de acceso y estado de cuentas registradas.',
        primary: `${totalUsers} usuario(s)`,
        secondary: `${supportRequiredUsers} con soporte`,
      };
    }

    if (activeModule === 'validadores') {
      return {
        tone: 'purple',
        title: 'Control de validadores',
        text: 'Revisa perfiles profesionales y autoriza únicamente cuentas verificadas.',
        primary: `${pendingValidators} pendiente(s)`,
        secondary: 'Revisión documental',
      };
    }

    if (activeModule === 'medicamentos') {
      return {
        tone: 'green',
        title: 'Inventario de medicamentos',
        text: 'Supervisa disponibilidad, vencimientos, validación y registros desactivados.',
        primary: `${totalMedicines} medicamento(s)`,
        secondary: `${criticalMedicines} alerta(s)`,
      };
    }

    if (activeModule === 'solicitudes') {
      return {
        tone: 'orange',
        title: 'Seguimiento de solicitudes',
        text: 'Controla estados, entregas, evidencias y solicitudes archivadas.',
        primary: `${totalRequests} solicitud(es)`,
        secondary: `${pendingRequests} pendiente(s)`,
      };
    }

    if (activeModule === 'reportes') {
      return {
        tone: 'teal',
        title: 'Reportes administrativos',
        text: 'Genera reportes por usuarios, medicamentos, solicitudes, validadores y alertas.',
        primary: 'PDF / impresión',
        secondary: 'Análisis operativo',
      };
    }

    if (activeModule === 'ajustes') {
      return {
        tone: 'gray',
        title: 'Ajustes del sistema',
        text: 'Configura reglas operativas básicas sin modificar el código fuente.',
        primary: 'Configuración',
        secondary: 'Reglas activas',
      };
    }

    return {
      tone: 'emerald',
      title: 'Resumen operativo',
      text: 'Accesos rápidos a las áreas principales del sistema administrativo.',
      primary: `${totalUsers} usuarios`,
      secondary: `${totalMedicines} medicamentos`,
    };
  };

  const summary = getSummaryContent();

  return (
    <section className={`module-summary module-summary-${summary.tone}`}>
      <div>
        <span className="module-summary-kicker">Vista activa</span>
        <h2>{summary.title}</h2>
        <p>{summary.text}</p>
      </div>

      <div className="module-summary-actions">
        <strong>{summary.primary}</strong>
        <span>{summary.secondary}</span>
      </div>

      <div className="module-summary-shortcuts">
        <button type="button" onClick={() => openUsersModule('todos', 'todos')}>Usuarios</button>
        <button type="button" onClick={() => openMedicinesModule('todos')}>Medicamentos</button>
        <button type="button" onClick={() => openRequestsModule('todos', 'todas')}>Solicitudes</button>
        <button type="button" onClick={() => openValidatorsModule('pendiente')}>Validadores</button>
      </div>
    </section>
  );
}

function SidebarButton({
  title,
  active,
  onClick,
  badge = 0,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{title}</span>
      <strong className={badge > 0 ? 'nav-badge show' : 'nav-badge'}>
        {badge > 0 ? badge : ''}
      </strong>
    </button>
  );
}

function DashboardModule({
  totalUsers,
  totalMedicines,
  totalRequests,
  pendingValidators,
  donantes,
  receptores,
  validadores,
  admins,
  publishedMedicines,
  disabledMedicines,
  pendingRequests,
  approvedRequests,
  deliveredRequests,
  openUsersModule,
  openValidatorsModule,
  openMedicinesModule,
  openRequestsModule,
}: {
  totalUsers: number;
  totalMedicines: number;
  totalRequests: number;
  pendingValidators: number;
  donantes: number;
  receptores: number;
  validadores: number;
  admins: number;
  publishedMedicines: number;
  disabledMedicines: number;
  pendingRequests: number;
  approvedRequests: number;
  deliveredRequests: number;
  openUsersModule: (roleFilter?: string, statusFilter?: string) => void;
  openValidatorsModule: (statusFilter?: string) => void;
  openMedicinesModule: (statusFilter?: string) => void;
  openRequestsModule: (statusFilter?: string, archiveFilter?: string) => void;
}) {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Usuarios registrados"
          value={totalUsers}
          description="Total de cuentas creadas en MediConnect."
          onClick={() => openUsersModule('todos', 'todos')}
        />

        <StatCard
          title="Medicamentos"
          value={totalMedicines}
          description="Medicamentos registrados en el sistema."
          onClick={() => openMedicinesModule('todos')}
        />

        <StatCard
          title="Solicitudes"
          value={totalRequests}
          description="Solicitudes realizadas por receptores."
          onClick={() => openRequestsModule('todos', 'todas')}
        />

        <StatCard
          title="Validadores pendientes"
          value={pendingValidators}
          description="Usuarios que requieren autorización."
          onClick={() => openValidatorsModule('pendiente')}
        />
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <h3>Usuarios por rol</h3>

          <InfoRow
            label="Donantes"
            value={donantes}
            onClick={() => openUsersModule('donante', 'todos')}
          />
          <InfoRow
            label="Receptores"
            value={receptores}
            onClick={() => openUsersModule('receptor', 'todos')}
          />
          <InfoRow
            label="Validadores"
            value={validadores}
            onClick={() => openUsersModule('validador', 'todos')}
          />
          <InfoRow
            label="Administradores"
            value={admins}
            onClick={() => openUsersModule('admin', 'todos')}
          />
        </div>

        <div className="panel-card">
          <h3>Estado de medicamentos</h3>

          <InfoRow
            label="Publicados"
            value={publishedMedicines}
            onClick={() => openMedicinesModule('publicado')}
          />
          <InfoRow
            label="Desactivados por admin"
            value={disabledMedicines}
            onClick={() => openMedicinesModule('desactivado')}
          />
          <InfoRow
            label="Total registrados"
            value={totalMedicines}
            onClick={() => openMedicinesModule('todos')}
          />
        </div>

        <div className="panel-card">
          <h3>Estado de solicitudes</h3>

          <InfoRow
            label="Pendientes"
            value={pendingRequests}
            onClick={() => openRequestsModule('pendiente', 'activas')}
          />
          <InfoRow
            label="Aprobadas"
            value={approvedRequests}
            onClick={() => openRequestsModule('aprobado', 'todas')}
          />
          <InfoRow
            label="Entregadas"
            value={deliveredRequests}
            onClick={() => openRequestsModule('entregado', 'todas')}
          />
          <InfoRow
            label="Total solicitudes"
            value={totalRequests}
            onClick={() => openRequestsModule('todos', 'todas')}
          />
        </div>
      </section>
    </>
  );
}

function UsersModule({
  totalUsers,
  activeUsers,
  suspendedUsers,
  supportRequiredUsers,
  filteredUsers,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  userStatusFilter,
  setUserStatusFilter,
  getRoleLabel,
  getStatusLabel,
  suspendUser,
  reactivateUser,
  changeUserRole,
  markUserNeedsSupport,
  markUserSupportResolved,
  sendUserPasswordReset,
}: {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  supportRequiredUsers: number;
  filteredUsers: UserData[];
  userSearch: string;
  setUserSearch: (value: string) => void;
  userRoleFilter: string;
  setUserRoleFilter: (value: string) => void;
  userStatusFilter: string;
  setUserStatusFilter: (value: string) => void;
  getRoleLabel: (role?: string) => string;
  getStatusLabel: (status?: string) => string;
  suspendUser: (user: UserData) => void;
  reactivateUser: (user: UserData) => void;
  changeUserRole: (user: UserData, newRole: string) => void;
  markUserNeedsSupport: (user: UserData) => void;
  markUserSupportResolved: (user: UserData) => void;
  sendUserPasswordReset: (user: UserData) => void;
}) {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Usuarios"
          value={totalUsers}
          description="Cuentas registradas en el sistema."
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('todos');
            setUserStatusFilter('todos');
          }}
        />

        <StatCard
          title="Activos"
          value={activeUsers}
          description="Usuarios que pueden ingresar."
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('todos');
            setUserStatusFilter('activo');
          }}
        />

        <StatCard
          title="Suspendidos"
          value={suspendedUsers}
          description="Cuentas bloqueadas por administración."
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('todos');
            setUserStatusFilter('suspendido');
          }}
        />

        <StatCard
          title="Soporte"
          value={supportRequiredUsers}
          description="Usuarios que requieren ayuda de acceso."
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('todos');
            setUserStatusFilter('soporte');
          }}
        />
      </section>

      <section className="panel-card user-module-card">
        <div className="module-header-row">
          <div>
            <h3>Usuarios registrados</h3>
            <p>
              Busca usuarios por nombre, correo, teléfono o ubicación. También
              puedes filtrar por rol o estado.
            </p>
          </div>

          <div className="result-counter">{filteredUsers.length} resultado(s)</div>
        </div>

        <div className="toolbar">
          <input
            className="search-input"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Buscar usuario..."
          />

          <div className="filter-group">
            <button className={`filter-chip ${userRoleFilter === 'todos' ? 'active' : ''}`} onClick={() => setUserRoleFilter('todos')}>Todos</button>
            <button className={`filter-chip ${userRoleFilter === 'donante' ? 'active' : ''}`} onClick={() => setUserRoleFilter('donante')}>Donantes</button>
            <button className={`filter-chip ${userRoleFilter === 'receptor' ? 'active' : ''}`} onClick={() => setUserRoleFilter('receptor')}>Receptores</button>
            <button className={`filter-chip ${userRoleFilter === 'validador' ? 'active' : ''}`} onClick={() => setUserRoleFilter('validador')}>Validadores</button>
            <button className={`filter-chip ${userRoleFilter === 'admin' ? 'active' : ''}`} onClick={() => setUserRoleFilter('admin')}>Admins</button>
          </div>

          <div className="filter-group">
            <button className={`filter-chip ${userStatusFilter === 'todos' ? 'active' : ''}`} onClick={() => setUserStatusFilter('todos')}>Todos</button>
            <button className={`filter-chip ${userStatusFilter === 'activo' ? 'active' : ''}`} onClick={() => setUserStatusFilter('activo')}>Activos</button>
            <button className={`filter-chip ${userStatusFilter === 'suspendido' ? 'active' : ''}`} onClick={() => setUserStatusFilter('suspendido')}>Suspendidos</button>
            <button className={`filter-chip ${userStatusFilter === 'soporte' ? 'active' : ''}`} onClick={() => setUserStatusFilter('soporte')}>Requieren soporte</button>
          </div>
        </div>

        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Contacto</th>
                <th>Ubicación</th>
                <th>Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No se encontraron usuarios con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.fullName || 'Usuario sin nombre'}</strong>
                          <span>{user.email || 'Correo no registrado'}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={`role-badge role-${user.role || 'none'}`}>{getRoleLabel(user.role)}</span></td>
                    <td>
                      <span className={`status-badge ${String(user.accountStatus || 'activo').toLowerCase() === 'activo' ? 'active' : 'blocked'}`}>
                        {getStatusLabel(user.accountStatus)}
                      </span>
                    </td>
                    <td>{user.phone || 'No registrado'}</td>
                    <td>{user.location || 'No registrada'}</td>
                    <td>
                      {user.accessSupportRequired ? (
                        <span className="support-status">Requiere soporte</span>
                      ) : user.passwordLoginEnabled ? (
                        <span className="ok-status">Contraseña activa</span>
                      ) : (
                        <span className="neutral-status">Sin alerta</span>
                      )}
                    </td>
                    <td>
                      <div className="validator-actions">
                        <select
                          className="filter-chip"
                          value={user.role || ''}
                          onChange={(event) => changeUserRole(user, event.target.value)}
                        >
                          <option value="">Sin rol</option>
                          <option value="donante">Donante</option>
                          <option value="receptor">Receptor</option>
                          <option value="validador">Validador</option>
                          <option value="admin">Admin</option>
                        </select>

                        {String(user.accountStatus || 'activo').toLowerCase() === 'activo' ? (
                          <button className="danger-button" onClick={() => suspendUser(user)}>Suspender</button>
                        ) : (
                          <button className="success-button" onClick={() => reactivateUser(user)}>Reactivar</button>
                        )}

                        {user.accessSupportRequired ? (
                          <button className="success-button" onClick={() => markUserSupportResolved(user)}>Soporte atendido</button>
                        ) : (
                          <button className="filter-chip" onClick={() => markUserNeedsSupport(user)}>Marcar soporte</button>
                        )}

                        <button className="filter-chip" onClick={() => sendUserPasswordReset(user)}>Enviar reset</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ValidatorsModule({
  totalValidators,
  pendingValidators,
  authorizedValidators,
  rejectedValidators,
  filteredValidators,
  validatorSearch,
  setValidatorSearch,
  validatorStatusFilter,
  setValidatorStatusFilter,
  getValidatorStatusLabel,
  authorizeValidator,
  rejectValidator,
}: {
  totalValidators: number;
  pendingValidators: number;
  authorizedValidators: number;
  rejectedValidators: number;
  filteredValidators: UserData[];
  validatorSearch: string;
  setValidatorSearch: (value: string) => void;
  validatorStatusFilter: string;
  setValidatorStatusFilter: (value: string) => void;
  getValidatorStatusLabel: (status?: string) => string;
  authorizeValidator: (validator: UserData) => void;
  rejectValidator: (validator: UserData) => void;
}) {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Validadores"
          value={totalValidators}
          description="Usuarios registrados como validadores."
          onClick={() => {
            setValidatorSearch('');
            setValidatorStatusFilter('todos');
          }}
        />
        <StatCard
          title="Pendientes"
          value={pendingValidators}
          description="Requieren autorización administrativa."
          onClick={() => {
            setValidatorSearch('');
            setValidatorStatusFilter('pendiente');
          }}
        />
        <StatCard
          title="Autorizados"
          value={authorizedValidators}
          description="Pueden revisar solicitudes y confirmar procesos."
          onClick={() => {
            setValidatorSearch('');
            setValidatorStatusFilter('autorizado');
          }}
        />
        <StatCard
          title="Rechazados"
          value={rejectedValidators}
          description="No fueron aprobados por administración."
          onClick={() => {
            setValidatorSearch('');
            setValidatorStatusFilter('rechazado');
          }}
        />
      </section>

      <section className="panel-card user-module-card">
        <div className="module-header-row">
          <div>
            <h3>Gestión de validadores</h3>
            <p>Revisa la información profesional de los validadores y autoriza únicamente a quienes cumplen con los requisitos.</p>
          </div>
          <div className="result-counter">{filteredValidators.length} resultado(s)</div>
        </div>

        <div className="toolbar">
          <input className="search-input" value={validatorSearch} onChange={(event) => setValidatorSearch(event.target.value)} placeholder="Buscar por nombre, correo, institución o colegiado..." />
          <div className="filter-group">
            <button className={`filter-chip ${validatorStatusFilter === 'todos' ? 'active' : ''}`} onClick={() => setValidatorStatusFilter('todos')}>Todos</button>
            <button className={`filter-chip ${validatorStatusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setValidatorStatusFilter('pendiente')}>Pendientes</button>
            <button className={`filter-chip ${validatorStatusFilter === 'autorizado' ? 'active' : ''}`} onClick={() => setValidatorStatusFilter('autorizado')}>Autorizados</button>
            <button className={`filter-chip ${validatorStatusFilter === 'rechazado' ? 'active' : ''}`} onClick={() => setValidatorStatusFilter('rechazado')}>Rechazados</button>
          </div>
        </div>

        {filteredValidators.length === 0 ? (
          <div className="empty-card">No se encontraron validadores con esos filtros.</div>
        ) : (
          <div className="validator-grid">
            {filteredValidators.map((validator) => {
              const validatorStatus = String(validator.validatorStatus || 'pendiente').toLowerCase();

              return (
                <div className="validator-card" key={validator.id}>
                  <div className="validator-card-header">
                    <div className="user-avatar large-avatar">{(validator.fullName || validator.email || 'V').charAt(0).toUpperCase()}</div>
                    <div>
                      <h3>{validator.fullName || 'Validador sin nombre'}</h3>
                      <p>{validator.email || 'Correo no registrado'}</p>
                    </div>
                  </div>

                  <div className="validator-info-grid">
                    <InfoText label="Estado" value={getValidatorStatusLabel(validator.validatorStatus)} />
                    <InfoText label="Autorizado" value={validator.validatorAuthorized ? 'Sí' : 'No'} />
                    <InfoText label="Teléfono" value={validator.phone || 'No registrado'} />
                    <InfoText label="Ubicación" value={validator.location || 'No registrada'} />
                    <InfoText label="Institución" value={validator.institution || 'No registrada'} />
                    <InfoText label="Tipo" value={validator.validatorType || 'No registrado'} />
                    <InfoText label="No. colegiado" value={validator.professionalLicenseNumber || 'No registrado'} />
                    <InfoText label="Documento" value={validator.validatorDocumentStatus || 'pendiente_revision'} />
                    <InfoText label="Archivo" value={validator.academicTitlePhotoName || 'No registrado'} />
                  </div>

                  <div className="validator-note">Revisa que la documentación profesional sea coherente antes de autorizar el perfil como validador.</div>

                  <div className="validator-actions">
                    {validatorStatus !== 'autorizado' && <button className="success-button" onClick={() => authorizeValidator(validator)}>Autorizar</button>}
                    {validatorStatus !== 'rechazado' && <button className="danger-button" onClick={() => rejectValidator(validator)}>Rechazar</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function MedicinesModule({
  totalMedicines,
  publishedMedicines,
  disabledMedicines,
  depletedMedicines,
  pendingValidationMedicines,
  expiredMedicines,
  expiring30Medicines,
  invalidExpirationMedicines,
  filteredMedicines,
  medicineSearch,
  setMedicineSearch,
  medicineStatusFilter,
  setMedicineStatusFilter,
  getExpirationStatus,
  getExpirationLabel,
  disableMedicine,
  reactivateMedicine,
  deleteMedicine,
}: {
  totalMedicines: number;
  publishedMedicines: number;
  disabledMedicines: number;
  depletedMedicines: number;
  pendingValidationMedicines: number;
  expiredMedicines: number;
  expiring30Medicines: number;
  invalidExpirationMedicines: number;
  filteredMedicines: MedicineData[];
  medicineSearch: string;
  setMedicineSearch: (value: string) => void;
  medicineStatusFilter: string;
  setMedicineStatusFilter: (value: string) => void;
  getExpirationStatus: (medicine: MedicineData) => string;
  getExpirationLabel: (medicine: MedicineData) => string;
  disableMedicine: (medicine: MedicineData) => void;
  reactivateMedicine: (medicine: MedicineData) => void;
  deleteMedicine: (medicine: MedicineData) => void;
}) {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Medicamentos"
          value={totalMedicines}
          description="Registros totales en el inventario."
          onClick={() => {
            setMedicineSearch('');
            setMedicineStatusFilter('todos');
          }}
        />
        <StatCard
          title="Publicados"
          value={publishedMedicines}
          description="Disponibles para receptores."
          onClick={() => {
            setMedicineSearch('');
            setMedicineStatusFilter('publicado');
          }}
        />
        <StatCard
          title="Críticos"
          value={expiredMedicines + expiring30Medicines + invalidExpirationMedicines}
          description="Vencidos, por vencer o con fecha inválida."
          onClick={() => {
            setMedicineSearch('');
            setMedicineStatusFilter('por_vencer_30');
          }}
        />
        <StatCard
          title="Desactivados"
          value={disabledMedicines}
          description="Bloqueados por administración."
          onClick={() => {
            setMedicineSearch('');
            setMedicineStatusFilter('desactivado');
          }}
        />
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <h3>Estado del inventario</h3>
          <InfoRow
            label="Agotados"
            value={depletedMedicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('agotado');
            }}
          />
          <InfoRow
            label="Pendientes de validación"
            value={pendingValidationMedicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('pendiente');
            }}
          />
          <InfoRow
            label="Desactivados"
            value={disabledMedicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('desactivado');
            }}
          />
        </div>

        <div className="panel-card">
          <h3>Alertas de vencimiento</h3>
          <InfoRow
            label="Vencidos activos"
            value={expiredMedicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('vencido');
            }}
          />
          <InfoRow
            label="Por vencer en 30 días"
            value={expiring30Medicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('por_vencer_30');
            }}
          />
          <InfoRow
            label="Fecha inválida o faltante"
            value={invalidExpirationMedicines}
            onClick={() => {
              setMedicineSearch('');
              setMedicineStatusFilter('fecha_invalida');
            }}
          />
        </div>

        <div className="panel-card">
          <h3>Recomendación</h3>
          <p className="panel-text">Revisa primero los medicamentos vencidos o con fecha inválida. Para conservar trazabilidad, se recomienda desactivar antes que eliminar.</p>
        </div>
      </section>

      <section className="panel-card user-module-card">
        <div className="module-header-row">
          <div>
            <h3>Gestión de medicamentos</h3>
            <p>Busca medicamentos por nombre, compuesto, lote, donante, ubicación o código. Puedes desactivar o reactivar registros desde este panel.</p>
          </div>
          <div className="result-counter">{filteredMedicines.length} resultado(s)</div>
        </div>

        <div className="toolbar">
          <input className="search-input" value={medicineSearch} onChange={(event) => setMedicineSearch(event.target.value)} placeholder="Buscar medicamento, compuesto, lote, donante o código..." />
          <div className="filter-group">
            <button className={`filter-chip ${medicineStatusFilter === 'todos' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('todos')}>Todos</button>
            <button className={`filter-chip ${medicineStatusFilter === 'activo' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('activo')}>Activos</button>
            <button className={`filter-chip ${medicineStatusFilter === 'desactivado' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('desactivado')}>Desactivados</button>
            <button className={`filter-chip ${medicineStatusFilter === 'publicado' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('publicado')}>Publicados</button>
            <button className={`filter-chip ${medicineStatusFilter === 'agotado' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('agotado')}>Agotados</button>
            <button className={`filter-chip ${medicineStatusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('pendiente')}>Pendientes</button>
            <button className={`filter-chip ${medicineStatusFilter === 'vencido' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('vencido')}>Vencidos</button>
            <button className={`filter-chip ${medicineStatusFilter === 'por_vencer_30' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('por_vencer_30')}>Por vencer</button>
            <button className={`filter-chip ${medicineStatusFilter === 'fecha_invalida' ? 'active' : ''}`} onClick={() => setMedicineStatusFilter('fecha_invalida')}>Fecha inválida</button>
          </div>
        </div>

        {filteredMedicines.length === 0 ? (
          <div className="empty-card">No se encontraron medicamentos con esos filtros.</div>
        ) : (
          <div className="medicine-grid">
            {filteredMedicines.map((medicine) => {
              const expirationStatus = getExpirationStatus(medicine);
              const isDisabled = medicine.adminDisabled === true;

              return (
                <div className="medicine-card" key={medicine.id}>
                  {medicine.medicinePhoto && <img src={medicine.medicinePhoto} alt={medicine.name || 'Medicamento'} className="medicine-image" />}

                  <div className="medicine-card-header">
                    <div>
                      <h3>{medicine.name || 'Medicamento sin nombre'}</h3>
                      <p>{medicine.active || 'Compuesto no registrado'}</p>
                    </div>
                    <span className={`expiration-badge ${expirationStatus}`}>{getExpirationLabel(medicine)}</span>
                  </div>

                  <div className="validator-info-grid">
                    <InfoText label="Miligramos" value={String(medicine.mg || 'No registrado')} />
                    <InfoText label="Lote" value={medicine.lot || 'No registrado'} />
                    <InfoText label="Vencimiento" value={medicine.expiration || 'No registrado'} />
                    <InfoText label="Cantidad" value={String(medicine.quantity ?? '0')} />
                    <InfoText label="Código" value={medicine.barcode || 'No registrado'} />
                    <InfoText label="Donante" value={medicine.donorName || 'No registrado'} />
                    <InfoText label="Tipo donante" value={medicine.donorType || 'No registrado'} />
                    <InfoText label="Contacto" value={medicine.donorPhone || 'No registrado'} />
                    <InfoText label="Ubicación" value={medicine.donorLocation || 'No registrada'} />
                    <InfoText label="Donación" value={medicine.donationStatus || 'No registrado'} />
                    <InfoText label="Validación" value={medicine.validationStatus || 'No registrado'} />
                    <InfoText label="Admin" value={isDisabled ? 'Desactivado' : 'Activo'} />
                  </div>

                  <div className="validator-note">
                    {expirationStatus === 'vencido'
                      ? 'Este medicamento está vencido. Se recomienda desactivarlo si aún aparece activo.'
                      : expirationStatus === 'por_vencer_7' || expirationStatus === 'por_vencer_30'
                        ? 'Este medicamento está próximo a vencer. Revisa si debe permanecer disponible.'
                        : expirationStatus === 'fecha_invalida'
                          ? 'La fecha de vencimiento no es válida o no está registrada. Requiere revisión.'
                          : 'Medicamento sin alerta crítica de vencimiento.'}
                  </div>

                  <div className="validator-actions">
                    {isDisabled ? (
                      <button className="success-button" onClick={() => reactivateMedicine(medicine)}>Reactivar</button>
                    ) : (
                      <button className="danger-button" onClick={() => disableMedicine(medicine)}>Desactivar</button>
                    )}
                    <button className="danger-button" onClick={() => deleteMedicine(medicine)}>Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function RequestsModule({
  totalRequests,
  pendingRequests,
  approvedRequests,
  rejectedRequests,
  deliveredRequests,
  archivedRequests,
  filteredRequests,
  requestSearch,
  setRequestSearch,
  requestStatusFilter,
  setRequestStatusFilter,
  requestArchiveFilter,
  setRequestArchiveFilter,
  getRequestStatusLabel,
  getEvidenceText,
  archiveRequest,
  restoreRequest,
  updateRequestStatus,
  deleteRequest,
}: {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  deliveredRequests: number;
  archivedRequests: number;
  filteredRequests: RequestData[];
  requestSearch: string;
  setRequestSearch: (value: string) => void;
  requestStatusFilter: string;
  setRequestStatusFilter: (value: string) => void;
  requestArchiveFilter: string;
  setRequestArchiveFilter: (value: string) => void;
  getRequestStatusLabel: (status?: string) => string;
  getEvidenceText: (request: RequestData) => string;
  archiveRequest: (request: RequestData) => void;
  restoreRequest: (request: RequestData) => void;
  updateRequestStatus: (request: RequestData, newStatus: string) => void;
  deleteRequest: (request: RequestData) => void;
}) {
  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Solicitudes"
          value={totalRequests}
          description="Total registradas en el sistema."
          onClick={() => {
            setRequestSearch('');
            setRequestStatusFilter('todos');
            setRequestArchiveFilter('todas');
          }}
        />
        <StatCard
          title="Pendientes"
          value={pendingRequests}
          description="Requieren seguimiento o validación."
          onClick={() => {
            setRequestSearch('');
            setRequestStatusFilter('pendiente');
            setRequestArchiveFilter('activas');
          }}
        />
        <StatCard
          title="Aprobadas"
          value={approvedRequests}
          description="Solicitudes autorizadas."
          onClick={() => {
            setRequestSearch('');
            setRequestStatusFilter('aprobado');
            setRequestArchiveFilter('todas');
          }}
        />
        <StatCard
          title="Archivadas"
          value={archivedRequests}
          description="Ocultas del historial activo."
          onClick={() => {
            setRequestSearch('');
            setRequestStatusFilter('todos');
            setRequestArchiveFilter('archivadas');
          }}
        />
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <h3>Estado de solicitudes</h3>
          <InfoRow
            label="Pendientes"
            value={pendingRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('pendiente');
              setRequestArchiveFilter('activas');
            }}
          />
          <InfoRow
            label="Aprobadas"
            value={approvedRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('aprobado');
              setRequestArchiveFilter('todas');
            }}
          />
          <InfoRow
            label="Rechazadas"
            value={rejectedRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('rechazado');
              setRequestArchiveFilter('todas');
            }}
          />
          <InfoRow
            label="Entregadas"
            value={deliveredRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('entregado');
              setRequestArchiveFilter('todas');
            }}
          />
        </div>

        <div className="panel-card">
          <h3>Administración</h3>
          <InfoRow
            label="Archivadas"
            value={archivedRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('todos');
              setRequestArchiveFilter('archivadas');
            }}
          />
          <InfoRow
            label="Activas"
            value={totalRequests - archivedRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('todos');
              setRequestArchiveFilter('activas');
            }}
          />
          <InfoRow
            label="Total"
            value={totalRequests}
            onClick={() => {
              setRequestSearch('');
              setRequestStatusFilter('todos');
              setRequestArchiveFilter('todas');
            }}
          />
        </div>

        <div className="panel-card">
          <h3>Recomendación</h3>
          <p className="panel-text">Archiva solicitudes antiguas o finalizadas para mantener limpio el panel, sin perder trazabilidad del proceso.</p>
        </div>
      </section>

      <section className="panel-card user-module-card">
        <div className="module-header-row">
          <div>
            <h3>Historial de solicitudes</h3>
            <p>Busca solicitudes por medicamento, receptor, donante, motivo o urgencia. También puedes filtrar por estado y archivo.</p>
          </div>
          <div className="result-counter">{filteredRequests.length} resultado(s)</div>
        </div>

        <div className="toolbar">
          <input className="search-input" value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="Buscar solicitud..." />

          <div className="filter-group">
            <button className={`filter-chip ${requestStatusFilter === 'todos' ? 'active' : ''}`} onClick={() => setRequestStatusFilter('todos')}>Todos</button>
            <button className={`filter-chip ${requestStatusFilter === 'pendiente' ? 'active' : ''}`} onClick={() => setRequestStatusFilter('pendiente')}>Pendientes</button>
            <button className={`filter-chip ${requestStatusFilter === 'aprobado' ? 'active' : ''}`} onClick={() => setRequestStatusFilter('aprobado')}>Aprobadas</button>
            <button className={`filter-chip ${requestStatusFilter === 'rechazado' ? 'active' : ''}`} onClick={() => setRequestStatusFilter('rechazado')}>Rechazadas</button>
            <button className={`filter-chip ${requestStatusFilter === 'entregado' ? 'active' : ''}`} onClick={() => setRequestStatusFilter('entregado')}>Entregadas</button>
          </div>

          <div className="filter-group">
            <button className={`filter-chip ${requestArchiveFilter === 'activas' ? 'active' : ''}`} onClick={() => setRequestArchiveFilter('activas')}>Activas</button>
            <button className={`filter-chip ${requestArchiveFilter === 'archivadas' ? 'active' : ''}`} onClick={() => setRequestArchiveFilter('archivadas')}>Archivadas</button>
            <button className={`filter-chip ${requestArchiveFilter === 'todas' ? 'active' : ''}`} onClick={() => setRequestArchiveFilter('todas')}>Todas</button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="empty-card">No se encontraron solicitudes con esos filtros.</div>
        ) : (
          <div className="request-grid">
            {filteredRequests.map((request) => {
              const isArchived = request.adminArchived === true;

              return (
                <div className="request-card" key={request.id}>
                  <div className="request-card-header">
                    <div>
                      <h3>{request.medicineName || 'Medicamento no registrado'}</h3>
                      <p>{request.medicineActive || 'Compuesto no registrado'}</p>
                    </div>
                    <span className={`request-status-badge ${String(request.status || 'pendiente').toLowerCase()}`}>
                      {getRequestStatusLabel(request.status)}
                    </span>
                  </div>

                  <div className="validator-info-grid">
                    <InfoText label="Receptor" value={request.receiverName || 'No registrado'} />
                    <InfoText label="Donante" value={request.donorName || 'No registrado'} />
                    <InfoText label="Teléfono receptor" value={request.receiverPhone || 'No registrado'} />
                    <InfoText label="Cantidad" value={String(request.requestedQuantity || '1')} />
                    <InfoText label="Urgencia" value={request.urgency || 'No registrada'} />
                    <InfoText label="Evidencia" value={getEvidenceText(request)} />
                    <InfoText label="Archivo" value={isArchived ? 'Archivada' : 'Activa'} />
                    <InfoText label="Estado" value={getRequestStatusLabel(request.status)} />
                  </div>

                  {request.requestReason && <div className="validator-note">Motivo: {request.requestReason}</div>}

                  <div className="validator-actions">
                    <select
                      className="filter-chip"
                      value={request.status || 'pendiente'}
                      onChange={(event) => updateRequestStatus(request, event.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobada</option>
                      <option value="rechazado">Rechazada</option>
                      <option value="entregado">Entregada</option>
                      <option value="recibido">Recibida</option>
                    </select>

                    {isArchived ? (
                      <button className="success-button" onClick={() => restoreRequest(request)}>Restaurar</button>
                    ) : (
                      <button className="danger-button" onClick={() => archiveRequest(request)}>Archivar</button>
                    )}

                    <button className="danger-button" onClick={() => deleteRequest(request)}>Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function ReportsModule({
  users,
  medicines,
  requests,
  validatorUsers,
  totalUsers,
  totalMedicines,
  totalRequests,
  pendingValidators,
  authorizedValidators,
  rejectedValidators,
  supportRequiredUsers,
  publishedMedicines,
  disabledMedicines,
  expiredMedicines,
  expiring30Medicines,
  invalidExpirationMedicines,
  pendingRequests,
  approvedRequests,
  rejectedRequests,
  deliveredRequests,
  archivedRequests,
  getRoleLabel,
  getStatusLabel,
  getValidatorStatusLabel,
  getRequestStatusLabel,
  getExpirationLabel,
}: {
  users: UserData[];
  medicines: MedicineData[];
  requests: RequestData[];
  validatorUsers: UserData[];
  totalUsers: number;
  totalMedicines: number;
  totalRequests: number;
  pendingValidators: number;
  authorizedValidators: number;
  rejectedValidators: number;
  supportRequiredUsers: number;
  publishedMedicines: number;
  disabledMedicines: number;
  expiredMedicines: number;
  expiring30Medicines: number;
  invalidExpirationMedicines: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  deliveredRequests: number;
  archivedRequests: number;
  getRoleLabel: (role?: string) => string;
  getStatusLabel: (status?: string) => string;
  getValidatorStatusLabel: (status?: string) => string;
  getRequestStatusLabel: (status?: string) => string;
  getExpirationLabel: (medicine: MedicineData) => string;
}) {
  const [reportType, setReportType] = useState('general');

  const today = new Date().toLocaleDateString('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeUsers = users.filter(
    (user) => String(user.accountStatus || 'activo').toLowerCase() === 'activo'
  ).length;

  const inactiveUsers = users.filter((user) => {
    const status = String(user.accountStatus || 'activo').toLowerCase();
    return ['suspendido', 'desactivado', 'bloqueado'].includes(status);
  }).length;

  const criticalMedicines =
    expiredMedicines + expiring30Medicines + invalidExpirationMedicines;

  const activeRequests = totalRequests - archivedRequests;
  const totalAlerts = pendingValidators + supportRequiredUsers + criticalMedicines + pendingRequests;

  const medicinesWithAlerts = medicines.filter((medicine) => {
    const label = getExpirationLabel(medicine).toLowerCase();
    return (
      label.includes('vencido') ||
      label.includes('vence en') ||
      label.includes('inválida') ||
      label.includes('invalida') ||
      medicine.adminDisabled === true
    );
  });

  const usersWithSupport = users.filter((user) => user.accessSupportRequired === true);
  const pendingValidatorList = validatorUsers.filter(
    (validator) => String(validator.validatorStatus || 'pendiente').toLowerCase() === 'pendiente'
  );
  const pendingRequestList = requests.filter(
    (request) => String(request.status || 'pendiente').toLowerCase() === 'pendiente'
  );

  const reportTitle =
    reportType === 'usuarios'
      ? 'Reporte administrativo de usuarios'
      : reportType === 'medicamentos'
        ? 'Reporte administrativo de medicamentos'
        : reportType === 'solicitudes'
          ? 'Reporte administrativo de solicitudes'
          : reportType === 'validadores'
            ? 'Reporte administrativo de validadores'
            : reportType === 'alertas'
              ? 'Reporte de alertas administrativas'
              : 'Reporte general administrativo';

  const reportDescription =
    reportType === 'usuarios'
      ? 'Detalle de cuentas, roles, estados, soporte de acceso y datos de contacto registrados en MediConnect.'
      : reportType === 'medicamentos'
        ? 'Control de inventario, vencimientos, estado administrativo y donantes vinculados a los medicamentos registrados.'
        : reportType === 'solicitudes'
          ? 'Seguimiento del historial de solicitudes, estados, receptores, donantes, evidencias y archivo administrativo.'
          : reportType === 'validadores'
            ? 'Revisión de perfiles validadores, autorización, institución, colegiado y estado documental.'
            : reportType === 'alertas'
              ? 'Consolidado de elementos que requieren atención administrativa prioritaria.'
              : 'Resumen ejecutivo del funcionamiento general de MediConnect para apoyar la toma de decisiones.';

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <section className="stats-grid no-print">
        <StatCard
          title="Usuarios"
          value={totalUsers}
          description="Cuentas registradas en el sistema."
        />

        <StatCard
          title="Medicamentos"
          value={totalMedicines}
          description="Inventario registrado para donación."
        />

        <StatCard
          title="Solicitudes"
          value={totalRequests}
          description="Historial operativo de receptores."
        />

        <StatCard
          title="Alertas"
          value={totalAlerts}
          description="Pendientes que requieren atención."
        />
      </section>

      <section className="panel-card report-control-panel no-print">
        <div className="module-header-row">
          <div>
            <h3>Centro de reportes</h3>
            <p>
              Selecciona un reporte específico, revisa la vista previa y utiliza
              el botón de impresión para guardarlo como PDF desde el navegador.
            </p>
          </div>

          <button className="print-button" onClick={handlePrint}>
            Imprimir / Guardar PDF
          </button>
        </div>

        <div className="report-tabs">
          <button className={`report-tab ${reportType === 'general' ? 'active' : ''}`} onClick={() => setReportType('general')}>General</button>
          <button className={`report-tab ${reportType === 'usuarios' ? 'active' : ''}`} onClick={() => setReportType('usuarios')}>Usuarios</button>
          <button className={`report-tab ${reportType === 'medicamentos' ? 'active' : ''}`} onClick={() => setReportType('medicamentos')}>Medicamentos</button>
          <button className={`report-tab ${reportType === 'solicitudes' ? 'active' : ''}`} onClick={() => setReportType('solicitudes')}>Solicitudes</button>
          <button className={`report-tab ${reportType === 'validadores' ? 'active' : ''}`} onClick={() => setReportType('validadores')}>Validadores</button>
          <button className={`report-tab ${reportType === 'alertas' ? 'active' : ''}`} onClick={() => setReportType('alertas')}>Alertas</button>
        </div>
      </section>

      <section className="report-sheet" id="printable-report">
        <div className="report-header">
          <div className="report-logo">+</div>
          <div>
            <h2>MediConnect</h2>
            <p>Panel web administrativo</p>
          </div>
        </div>

        <div className="report-title-block">
          <span className="report-tag">Reporte generado automáticamente</span>
          <h1>{reportTitle}</h1>
          <p>{reportDescription}</p>
          <div className="report-meta-grid">
            <div>
              <span>Fecha de generación</span>
              <strong>{today}</strong>
            </div>
            <div>
              <span>Responsable</span>
              <strong>{auth.currentUser?.email || 'Administrador del sistema'}</strong>
            </div>
            <div>
              <span>Fuente de datos</span>
              <strong>Firebase / Firestore</strong>
            </div>
          </div>
        </div>

        {reportType === 'general' && (
          <>
            <section className="report-section">
              <h3>Resumen ejecutivo</h3>
              <p>
                Este reporte consolida el estado general de usuarios,
                medicamentos, validadores y solicitudes. Su objetivo es facilitar
                una lectura rápida de la operación actual y señalar los puntos
                que requieren seguimiento administrativo.
              </p>
            </section>

            <section className="report-kpi-grid">
              <ReportKpi label="Usuarios registrados" value={totalUsers} />
              <ReportKpi label="Usuarios activos" value={activeUsers} />
              <ReportKpi label="Usuarios suspendidos" value={inactiveUsers} />
              <ReportKpi label="Soporte de acceso" value={supportRequiredUsers} />
              <ReportKpi label="Medicamentos registrados" value={totalMedicines} />
              <ReportKpi label="Medicamentos publicados" value={publishedMedicines} />
              <ReportKpi label="Medicamentos críticos" value={criticalMedicines} />
              <ReportKpi label="Medicamentos desactivados" value={disabledMedicines} />
              <ReportKpi label="Solicitudes registradas" value={totalRequests} />
              <ReportKpi label="Solicitudes activas" value={activeRequests} />
              <ReportKpi label="Solicitudes pendientes" value={pendingRequests} />
              <ReportKpi label="Solicitudes archivadas" value={archivedRequests} />
              <ReportKpi label="Validadores pendientes" value={pendingValidators} />
              <ReportKpi label="Validadores autorizados" value={authorizedValidators} />
              <ReportKpi label="Validadores rechazados" value={rejectedValidators} />
              <ReportKpi label="Alertas totales" value={totalAlerts} />
            </section>

            <section className="report-section-grid">
              <div className="report-insight-card">
                <h4>Usuarios</h4>
                <p>
                  Hay {totalUsers} usuario(s) registrados. {supportRequiredUsers} requieren soporte de acceso y {inactiveUsers} se encuentran suspendidos, desactivados o bloqueados.
                </p>
              </div>
              <div className="report-insight-card">
                <h4>Medicamentos</h4>
                <p>
                  El inventario contiene {totalMedicines} medicamento(s). {criticalMedicines} requieren revisión por vencimiento, fecha inválida o estado administrativo.
                </p>
              </div>
              <div className="report-insight-card">
                <h4>Solicitudes</h4>
                <p>
                  Existen {totalRequests} solicitud(es), de las cuales {pendingRequests} están pendientes y {archivedRequests} se encuentran archivadas.
                </p>
              </div>
            </section>

            <section className="report-section">
              <h3>Recomendaciones administrativas</h3>
              <ul className="report-action-list">
                <li>Atender los validadores pendientes antes de permitir validaciones médicas.</li>
                <li>Revisar medicamentos vencidos, por vencer o con fecha inválida antes de mantenerlos disponibles.</li>
                <li>Resolver usuarios marcados con soporte para evitar problemas de acceso.</li>
                <li>Archivar solicitudes antiguas o finalizadas para mantener limpio el historial operativo.</li>
              </ul>
            </section>
          </>
        )}

        {reportType === 'usuarios' && (
          <>
            <section className="report-kpi-grid compact-report-grid">
              <ReportKpi label="Total usuarios" value={totalUsers} />
              <ReportKpi label="Activos" value={activeUsers} />
              <ReportKpi label="Suspendidos" value={inactiveUsers} />
              <ReportKpi label="Soporte acceso" value={supportRequiredUsers} />
            </section>

            <section className="report-section">
              <h3>Detalle de usuarios</h3>
              <ReportTable
                headers={['Nombre', 'Correo', 'Rol', 'Estado', 'Teléfono', 'Ubicación', 'Soporte']}
                rows={users.map((user) => [
                  user.fullName || 'Sin nombre',
                  user.email || 'No registrado',
                  getRoleLabel(user.role),
                  getStatusLabel(user.accountStatus),
                  user.phone || 'No registrado',
                  user.location || 'No registrada',
                  user.accessSupportRequired ? 'Requiere soporte' : 'Sin alerta',
                ])}
              />
            </section>

            {usersWithSupport.length > 0 && (
              <section className="report-section">
                <h3>Usuarios que requieren soporte</h3>
                <ReportTable
                  headers={['Usuario', 'Correo', 'Rol', 'Observación']}
                  rows={usersWithSupport.map((user) => [
                    user.fullName || 'Sin nombre',
                    user.email || 'No registrado',
                    getRoleLabel(user.role),
                    user.accessSupportNote || 'Requiere seguimiento administrativo',
                  ])}
                />
              </section>
            )}
          </>
        )}

        {reportType === 'medicamentos' && (
          <>
            <section className="report-kpi-grid compact-report-grid">
              <ReportKpi label="Total medicamentos" value={totalMedicines} />
              <ReportKpi label="Publicados" value={publishedMedicines} />
              <ReportKpi label="Críticos" value={criticalMedicines} />
              <ReportKpi label="Desactivados" value={disabledMedicines} />
            </section>

            <section className="report-section">
              <h3>Detalle de medicamentos</h3>
              <ReportTable
                headers={['Medicamento', 'Compuesto', 'Mg', 'Lote', 'Vencimiento', 'Alerta', 'Cantidad', 'Donante', 'Estado']}
                rows={medicines.map((medicine) => [
                  medicine.name || 'Sin nombre',
                  medicine.active || 'No registrado',
                  String(medicine.mg || 'No registrado'),
                  medicine.lot || 'No registrado',
                  medicine.expiration || 'No registrado',
                  getExpirationLabel(medicine),
                  String(medicine.quantity ?? '0'),
                  medicine.donorName || 'No registrado',
                  medicine.adminDisabled ? 'Desactivado' : medicine.donationStatus || 'Activo',
                ])}
              />
            </section>

            {medicinesWithAlerts.length > 0 && (
              <section className="report-section">
                <h3>Medicamentos con alerta</h3>
                <ReportTable
                  headers={['Medicamento', 'Lote', 'Vencimiento', 'Alerta', 'Donante', 'Estado admin']}
                  rows={medicinesWithAlerts.map((medicine) => [
                    medicine.name || 'Sin nombre',
                    medicine.lot || 'No registrado',
                    medicine.expiration || 'No registrado',
                    getExpirationLabel(medicine),
                    medicine.donorName || 'No registrado',
                    medicine.adminDisabled ? 'Desactivado' : 'Activo',
                  ])}
                />
              </section>
            )}
          </>
        )}

        {reportType === 'solicitudes' && (
          <>
            <section className="report-kpi-grid compact-report-grid">
              <ReportKpi label="Total solicitudes" value={totalRequests} />
              <ReportKpi label="Pendientes" value={pendingRequests} />
              <ReportKpi label="Aprobadas" value={approvedRequests} />
              <ReportKpi label="Rechazadas" value={rejectedRequests} />
              <ReportKpi label="Entregadas" value={deliveredRequests} />
              <ReportKpi label="Archivadas" value={archivedRequests} />
            </section>

            <section className="report-section">
              <h3>Detalle de solicitudes</h3>
              <ReportTable
                headers={['Medicamento', 'Receptor', 'Donante', 'Estado', 'Cantidad', 'Urgencia', 'Evidencia', 'Archivo']}
                rows={requests.map((request) => [
                  request.medicineName || 'No registrado',
                  request.receiverName || 'No registrado',
                  request.donorName || 'No registrado',
                  getRequestStatusLabel(request.status),
                  String(request.requestedQuantity ?? '0'),
                  request.urgency || 'No registrada',
                  request.evidencePhoto ? 'Sí' : 'No',
                  request.adminArchived ? 'Archivada' : 'Activa',
                ])}
              />
            </section>
          </>
        )}

        {reportType === 'validadores' && (
          <>
            <section className="report-kpi-grid compact-report-grid">
              <ReportKpi label="Total validadores" value={validatorUsers.length} />
              <ReportKpi label="Pendientes" value={pendingValidators} />
              <ReportKpi label="Autorizados" value={authorizedValidators} />
              <ReportKpi label="Rechazados" value={rejectedValidators} />
            </section>

            <section className="report-section">
              <h3>Detalle de validadores</h3>
              <ReportTable
                headers={['Nombre', 'Correo', 'Estado', 'Autorizado', 'Institución', 'Colegiado', 'Documento']}
                rows={validatorUsers.map((validator) => [
                  validator.fullName || 'Sin nombre',
                  validator.email || 'No registrado',
                  getValidatorStatusLabel(validator.validatorStatus),
                  validator.validatorAuthorized ? 'Sí' : 'No',
                  validator.institution || 'No registrada',
                  validator.professionalLicenseNumber || 'No registrado',
                  validator.validatorDocumentStatus || 'Pendiente',
                ])}
              />
            </section>
          </>
        )}

        {reportType === 'alertas' && (
          <>
            <section className="report-kpi-grid compact-report-grid">
              <ReportKpi label="Alertas totales" value={totalAlerts} />
              <ReportKpi label="Validadores pendientes" value={pendingValidators} />
              <ReportKpi label="Medicamentos críticos" value={criticalMedicines} />
              <ReportKpi label="Usuarios con soporte" value={supportRequiredUsers} />
              <ReportKpi label="Solicitudes pendientes" value={pendingRequests} />
            </section>

            <section className="report-section-grid">
              <div className="report-insight-card">
                <h4>Validadores pendientes</h4>
                <p>{pendingValidatorList.length} perfil(es) necesitan revisión administrativa.</p>
              </div>
              <div className="report-insight-card">
                <h4>Medicamentos críticos</h4>
                <p>{criticalMedicines} medicamento(s) necesitan revisión por vencimiento, fecha inválida o disponibilidad.</p>
              </div>
              <div className="report-insight-card">
                <h4>Soporte de acceso</h4>
                <p>{usersWithSupport.length} usuario(s) requieren seguimiento de acceso.</p>
              </div>
              <div className="report-insight-card">
                <h4>Solicitudes pendientes</h4>
                <p>{pendingRequestList.length} solicitud(es) siguen pendientes de atención.</p>
              </div>
            </section>

            <section className="report-section">
              <h3>Acciones recomendadas</h3>
              <ul className="report-action-list">
                <li>Priorizar solicitudes pendientes relacionadas con medicamentos próximos a vencer.</li>
                <li>Revisar validadores pendientes para mantener la seguridad del proceso.</li>
                <li>Contactar a usuarios marcados con soporte de acceso.</li>
                <li>Desactivar medicamentos vencidos o con información incompleta.</li>
              </ul>
            </section>
          </>
        )}

        <div className="report-footer">
          <p>
            Reporte generado desde el panel web administrativo de MediConnect.
            La información depende de los registros disponibles en Firebase al
            momento de generar el documento.
          </p>
        </div>
      </section>
    </>
  );
}


function SettingsModule({
  systemSettings,
  settingsDraft,
  setSettingsDraft,
  settingsLoading,
  settingsSaving,
  saveSystemSettings,
  resetSettingsDraft,
}: {
  systemSettings: SystemSettings;
  settingsDraft: SystemSettings;
  setSettingsDraft: (settings: SystemSettings) => void;
  settingsLoading: boolean;
  settingsSaving: boolean;
  saveSystemSettings: () => void;
  resetSettingsDraft: () => void;
}) {
  const hasChanges =
    JSON.stringify(systemSettings) !== JSON.stringify(settingsDraft);

  const updateDraft = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettingsDraft({
      ...settingsDraft,
      [key]: value,
    });
  };

  if (settingsLoading) {
    return (
      <section className="panel-card settings-panel">
        <div className="loading-box">Cargando ajustes del sistema...</div>
      </section>
    );
  }

  return (
    <>
      <section className="stats-grid">
        <StatCard
          title="Vencimiento mínimo"
          value={settingsDraft.minExpirationDays}
          description="Días mínimos recomendados antes de aceptar medicamentos."
        />

        <StatCard
          title="Evidencia"
          value={settingsDraft.evidenceRequired ? 1 : 0}
          description={
            settingsDraft.evidenceRequired
              ? 'Las solicitudes requieren evidencia.'
              : 'Las solicitudes no requieren evidencia.'
          }
        />

        <StatCard
          title="Validadores"
          value={settingsDraft.validatorAuthorizationRequired ? 1 : 0}
          description={
            settingsDraft.validatorAuthorizationRequired
              ? 'Requieren aprobación administrativa.'
              : 'No requieren aprobación administrativa.'
          }
        />

      </section>

      <section className="settings-layout">
        <div className="panel-card settings-panel">
          <div className="module-header-row">
            <div>
              <h3>Configuración general</h3>
              <p>
                Estos ajustes se guardan en Firebase en el documento
                settings/system y pueden ser usados por la app móvil y el panel
                web.
              </p>
            </div>

            {hasChanges && (
              <div className="settings-unsaved-badge">Cambios sin guardar</div>
            )}
          </div>

          <div className="settings-form-grid">
            <label className="settings-field">
              <span>Nombre del sistema</span>
              <input
                value={settingsDraft.appName}
                onChange={(event) => updateDraft('appName', event.target.value)}
                placeholder="MediConnect"
              />
            </label>

            <label className="settings-field">
              <span>Correo de soporte</span>
              <input
                value={settingsDraft.supportEmail}
                onChange={(event) =>
                  updateDraft('supportEmail', event.target.value)
                }
                placeholder="soporte@mediconnect.com"
              />
            </label>

            <label className="settings-field full-field">
              <span>Mensaje administrativo</span>
              <textarea
                value={settingsDraft.adminMessage}
                onChange={(event) =>
                  updateDraft('adminMessage', event.target.value)
                }
                placeholder="Mensaje visible para administración."
                rows={4}
              />
            </label>

            <label className="settings-field">
              <span>Días mínimos antes del vencimiento</span>
              <input
                type="number"
                min={1}
                value={settingsDraft.minExpirationDays}
                onChange={(event) =>
                  updateDraft(
                    'minExpirationDays',
                    Number(event.target.value || 1)
                  )
                }
              />
            </label>
          </div>

          <div className="settings-switch-grid">
            <SettingsSwitch
              title="Requerir evidencia"
              description="Indica si las solicitudes deben incluir evidencia cuando aplique."
              checked={settingsDraft.evidenceRequired}
              onChange={(value) => updateDraft('evidenceRequired', value)}
            />

            <SettingsSwitch
              title="Autorizar validadores"
              description="Obliga a que los validadores sean aprobados por un administrador."
              checked={settingsDraft.validatorAuthorizationRequired}
              onChange={(value) =>
                updateDraft('validatorAuthorizationRequired', value)
              }
            />

            <SettingsSwitch
              title="Permitir registro de validadores"
              description="Controla si nuevos usuarios pueden registrarse como validadores."
              checked={settingsDraft.allowValidatorRegistration}
              onChange={(value) =>
                updateDraft('allowValidatorRegistration', value)
              }
            />

          </div>

          <div className="settings-actions">
            <button
              className="success-button"
              onClick={saveSystemSettings}
              disabled={settingsSaving || !hasChanges}
            >
              {settingsSaving ? 'Guardando...' : 'Guardar ajustes'}
            </button>

            <button
              className="filter-chip"
              onClick={resetSettingsDraft}
              disabled={settingsSaving || !hasChanges}
            >
              Descartar cambios
            </button>
          </div>
        </div>

        <aside className="settings-summary">
          <div className="settings-summary-card">
            <h3>Estado actual</h3>
            <InfoText label="Sistema" value={systemSettings.appName} />
            <InfoText
              label="Mensaje"
              value={systemSettings.adminMessage || 'Sin mensaje'}
            />
            <InfoText
              label="Soporte"
              value={systemSettings.supportEmail || 'No registrado'}
            />
            <InfoText
              label="Días mínimos"
              value={`${systemSettings.minExpirationDays} día(s)`}
            />
            <InfoText
              label="Evidencia"
              value={systemSettings.evidenceRequired ? 'Activa' : 'Inactiva'}
            />
            <InfoText
              label="Autorización de validadores"
              value={
                systemSettings.validatorAuthorizationRequired
                  ? 'Requerida'
                  : 'No requerida'
              }
            />
            <InfoText
              label="Registro de validadores"
              value={
                systemSettings.allowValidatorRegistration
                  ? 'Permitido'
                  : 'Bloqueado'
              }
            />
          </div>

          <div className="settings-help-card">
            <h3>Recomendación</h3>
            <p>
              Mantén el mínimo de vencimiento en 30 días o más para reducir el
              riesgo de publicar medicamentos próximos a vencer. También revisa
              periódicamente las alertas de medicamentos críticos y solicitudes pendientes.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

function SettingsSwitch({
  title,
  description,
  checked,
  onChange,
  danger = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? 'active' : ''} ${
        danger ? 'danger' : ''
      }`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch-toggle">{checked ? 'Sí' : 'No'}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ReportKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="report-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="report-table-wrapper">
      <table className="report-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length}>No hay datos disponibles.</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={`report-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`report-cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function InfoText({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-text">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  onClick,
}: {
  title: string;
  value: number;
  description: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>{value}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onClick && <small>Ver detalle</small>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="stat-card stat-card-button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="stat-card">{content}</div>;
}

function InfoRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="info-row info-row-button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="info-row">{content}</div>;
}
