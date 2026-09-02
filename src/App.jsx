import { useState } from 'react';

const applicationOptions = [
  {
    id: 'pc',
    title: 'PCの持ち出し・持ち込み申請',
    description: '業務用PCの持ち出しや持ち込みを申請します。',
  },
  {
    id: 'smartphone',
    title: 'スマホ購入申請',
    description: 'スマートフォン購入に必要な申請を行います。',
  },
  {
    id: 'external-storage',
    title: '外部記憶装置使用申請',
    description: '外部記憶装置の利用許可を申請します。',
  },
  {
    id: 'wifi',
    title: '無線LAN使用申請',
    description: '無線LAN利用に関する申請を行います。',
  },
];

const formConfig = {
  pc: {
    title: 'PCの持ち出し・持ち込み申請',
    fields: [
      { key: 'name', label: '氏名', type: 'text', placeholder: '氏名を入力' },
      { key: 'managementNumber', label: '管理番号', type: 'text', placeholder: '管理番号を入力' },
      { key: 'startDate', label: '使用開始日', type: 'date' },
      { key: 'location', label: '利用場所', type: 'text', placeholder: '利用場所を入力' },
    ],
  },
  smartphone: {
    title: 'スマホ購入申請',
    fields: [
      { key: 'name', label: '氏名', type: 'text', placeholder: '氏名を入力' },
      { key: 'model', label: '機種', type: 'text', placeholder: '機種を入力' },
      { key: 'carrier', label: 'キャリア', type: 'text', placeholder: 'キャリアを入力' },
      { key: 'purchaseDate', label: '購入日', type: 'date' },
      { key: 'capacity', label: '容量', type: 'text', placeholder: '容量を入力' },
    ],
  },
  'external-storage': {
    title: '外部記憶装置使用申請',
    fields: [
      { key: 'name', label: '氏名', type: 'text', placeholder: '氏名を入力' },
      { key: 'deviceName', label: '機器名', type: 'text', placeholder: '機器名を入力' },
      { key: 'capacity', label: '容量', type: 'text', placeholder: '容量を入力' },
      { key: 'location', label: '場所', type: 'text', placeholder: '場所を入力' },
      { key: 'date', label: '日付', type: 'date' },
    ],
  },
  wifi: {
    title: '無線LAN使用申請',
    fields: [
      { key: 'name', label: '氏名', type: 'text', placeholder: '氏名を入力' },
      { key: 'type', label: '種類', type: 'text', placeholder: '種類を入力' },
      { key: 'deviceName', label: '機器名', type: 'text', placeholder: '機器名を入力' },
      { key: 'location', label: '場所', type: 'text', placeholder: '場所を入力' },
      { key: 'date', label: '日付', type: 'date' },
    ],
  },
};

const initialFormValues = {
  pc: {
    name: '',
    managementNumber: '',
    startDate: '',
    location: '',
  },
  smartphone: {
    name: '',
    model: '',
    carrier: '',
    purchaseDate: '',
    capacity: '',
  },
  'external-storage': {
    name: '',
    deviceName: '',
    capacity: '',
    location: '',
    date: '',
  },
  wifi: {
    name: '',
    type: '',
    deviceName: '',
    location: '',
    date: '',
  },
};

const initialCompleted = {
  pc: false,
  smartphone: false,
  'external-storage': false,
  wifi: false,
};

function App() {
  const [screen, setScreen] = useState('login');
  const [formValues, setFormValues] = useState(initialFormValues);
  const [completed, setCompleted] = useState(initialCompleted);

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    setScreen('main');
  };

  const handleInputChange = (screenKey, field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [screenKey]: {
        ...prev[screenKey],
        [field]: value,
      },
    }));
  };

  const handleFormSubmit = (screenKey, event) => {
    event.preventDefault();
    setCompleted((prev) => ({
      ...prev,
      [screenKey]: true,
    }));
  };

  if (screen === 'login') {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>ログイン</h1>

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label className="field">
              <span>ログイン名</span>
              <input type="text" name="username" placeholder="ログイン名を入力" />
            </label>

            <label className="field">
              <span>パスワード</span>
              <input type="password" name="password" placeholder="パスワードを入力" />
            </label>

            <div className="options-row">
              <label className="remember-me">
                <input type="checkbox" />
                <span>ログイン状態を保持</span>
              </label>
              <a href="#">パスワードを忘れた方</a>
            </div>

            <button type="submit" className="login-button">
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === 'main') {
    return (
      <div className="main-page">
        <div className="main-card">
          <h1>申請メニュー</h1>
          <p className="main-subtitle">以下の申請のいずれかを選択してください。</p>

          <div className="option-grid">
            {applicationOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="option-card"
                onClick={() => setScreen(item.id)}
              >
                <span className="option-title">{item.title}</span>
                <span className="option-description">{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentForm = formConfig[screen];

  return (
    <div className="form-page">
      <div className="form-card">
        <button type="button" className="back-button" onClick={() => setScreen('main')}>
          戻る
        </button>

        <h1>{currentForm.title}</h1>

        <form className="application-form" onSubmit={(event) => handleFormSubmit(screen, event)}>
          {currentForm.fields.map((field) => (
            <label key={field.key} className="form-field">
              <span>{field.label}</span>
              <input
                type={field.type}
                value={formValues[screen][field.key]}
                onChange={(event) => handleInputChange(screen, field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}

          <button type="submit" className="submit-button">
            決定
          </button>

          {completed[screen] && <p className="success-message">更新が完了しました</p>}
        </form>
      </div>
    </div>
  );
}

export default App;