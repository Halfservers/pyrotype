export const SYSTEM_PERMISSIONS: Record<string, { description: string; keys: Record<string, string> }> = {
  websocket: {
    description: 'Allows the user to connect to the server websocket, giving them access to view console output and realtime server stats.',
    keys: {
      connect: 'Allows a user to connect to the websocket instance for a server to stream the console.',
    },
  },
  control: {
    description: "Permissions that control a user's ability to control the power state of a server, or send commands.",
    keys: {
      console: 'Allows a user to send commands to the server instance via the console.',
      start: 'Allows a user to start the server if it is stopped.',
      stop: 'Allows a user to stop a server if it is running.',
      restart: 'Allows a user to perform a server restart.',
    },
  },
  user: {
    description: 'Permissions that allow a user to manage other subusers on a server.',
    keys: {
      create: 'Allows a user to create new subusers for the server.',
      read: 'Allows the user to view subusers and their permissions for the server.',
      update: 'Allows a user to modify other subusers.',
      delete: 'Allows a user to delete a subuser from the server.',
    },
  },
  file: {
    description: "Permissions that control a user's ability to modify the filesystem for this server.",
    keys: {
      create: 'Allows a user to create additional files and folders via the Panel or direct upload.',
      read: 'Allows a user to view the contents of a directory.',
      'read-content': 'Allows a user to view the contents of a given file.',
      update: 'Allows a user to update the contents of an existing file or directory.',
      delete: 'Allows a user to delete files or directories.',
      archive: 'Allows a user to archive the contents of a directory as well as decompress existing archives.',
      sftp: 'Allows a user to connect to SFTP and manage server files using the other assigned file permissions.',
    },
  },
  backup: {
    description: "Permissions that control a user's ability to generate and manage server backups.",
    keys: {
      create: 'Allows a user to create new backups for this server.',
      read: 'Allows a user to view all backups that exist for this server.',
      delete: 'Allows a user to remove backups from the system.',
      download: 'Allows a user to download a backup for the server.',
      restore: 'Allows a user to restore a backup for the server.',
    },
  },
  allocation: {
    description: "Permissions that control a user's ability to modify the port allocations for this server.",
    keys: {
      read: 'Allows a user to view all allocations currently assigned to this server.',
      create: 'Allows a user to assign additional allocations to the server.',
      update: 'Allows a user to change the primary server allocation and attach notes to each allocation.',
      delete: 'Allows a user to delete an allocation from the server.',
    },
  },
  startup: {
    description: "Permissions that control a user's ability to view this server's startup parameters.",
    keys: {
      read: 'Allows a user to view the startup variables for a server.',
      update: 'Allows a user to modify the startup variables for the server.',
      command: 'Allows a user to modify the startup command for the server.',
      'docker-image': 'Allows a user to modify the Docker image used when running the server.',
      software: 'Allows a user to modify the game / software used for the server.',
    },
  },
  database: {
    description: "Permissions that control a user's access to the database management for this server.",
    keys: {
      create: 'Allows a user to create a new database for this server.',
      read: 'Allows a user to view the database associated with this server.',
      update: 'Allows a user to rotate the password on a database instance.',
      delete: 'Allows a user to remove a database instance from this server.',
      view_password: 'Allows a user to view the password associated with a database instance for this server.',
    },
  },
  schedule: {
    description: "Permissions that control a user's access to the schedule management for this server.",
    keys: {
      create: 'Allows a user to create new schedules for this server.',
      read: 'Allows a user to view schedules and the tasks associated with them for this server.',
      update: 'Allows a user to update schedules and schedule tasks for this server.',
      delete: 'Allows a user to delete schedules for this server.',
    },
  },
  settings: {
    description: "Permissions that control a user's access to the settings for this server.",
    keys: {
      rename: 'Allows a user to rename this server and change the description of it.',
      reinstall: 'Allows a user to trigger a reinstall of this server.',
    },
  },
  activity: {
    description: "Permissions that control a user's access to the server activity logs.",
    keys: {
      read: 'Allows a user to view the activity logs for the server.',
    },
  },
  mod: {
    description: "Permissions that control a user's access to downloading and updating mods.",
    keys: {
      version: 'Allows a user to change what version to download for.',
      loader: 'Allows a user to change what loader to download for.',
      download: 'Allows a user to download mods to the server.',
      resolver: 'Allows a user to access the Dependency Resolver.',
      update: 'Allows a user to update currently installed mods.',
    },
  },
};
