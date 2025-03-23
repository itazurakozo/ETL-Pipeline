import React, { Component } from 'react';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: null,
      logs: [],
      loadingLogs: false,
      statusPolling: null, // To hold the setInterval ID for stopping the polling
    };
    this.handleLoadData = this.handleLoadData.bind(this);
    this.handleGetStatus = this.handleGetStatus.bind(this);
    this.handleClearDatabase = this.handleClearDatabase.bind(this);
    this.handleFetchLogs = this.handleFetchLogs.bind(this);
  }

  async handleLoadData() {
    try {
      const response = await fetch('/load-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Load data request' }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Response:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async handleGetStatus() {
    try {
      const response = await fetch('/etl/status');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      this.setState({ status: data });

      // If the stage is "Complete", stop the polling
      if (data.stage === 'Complete') {
        clearInterval(this.state.statusPolling);
        this.setState({ statusPolling: null });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async handleClearDatabase() {
    try {
      const response = await fetch('/clear-all-data');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async handleFetchLogs() {
    this.setState({ loadingLogs: true });
    try {
      const response = await fetch('/winston');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const text = await response.text();
      const logs = text.split('\n').filter(line => line).map(log => {
        return { timestamp: new Date().toLocaleTimeString(), message: log };
      });
      this.setState({ logs });
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      this.setState({ loadingLogs: false });
    }
  }

  startPollingStatus() {
    // Start polling every 5 seconds
    const intervalId = setInterval(this.handleGetStatus, 3000);
    this.setState({ statusPolling: intervalId });
  }

  render() {
    return (
      <div className="container">
        <h1>ETL Pipeline</h1>
        <button 
          className="btn" 
          onClick={this.handleLoadData}
        >
          Load Data
        </button>
        <button 
          className="btn" 
          onClick={() => this.startPollingStatus()}
        >
          Get Status
        </button>
        <button 
          className="btn" 
          onClick={this.handleClearDatabase}
        >
          Clear Database
        </button>
        <button 
          className="btn" 
          onClick={this.handleFetchLogs} 
          disabled={this.state.loadingLogs}
        >
          {this.state.loadingLogs ? 'Fetching Logs...' : 'Fetch Logs'}
        </button>
        
        {this.state.status && (
        <div className="status-section">
          <h2>Status</h2>
          <pre className="status-output">{JSON.stringify(this.state.status, null, 2)}</pre>
        </div>
      )}
  
        {this.state.logs.length > 0 && (
          <div className="logs-section">
            <h2>Logs</h2>
            <div className="logs-container">
              {this.state.logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <strong>[{log.timestamp}]</strong> {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default App;
