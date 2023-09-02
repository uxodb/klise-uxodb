---
title: "Hetzner: Installing Linux"
date: 2023-09-02
tags: [unix/linux, cli, hetzner]
---
Some years ago, I leased a dedicated server from Hetzner. In this piece I will outline Hetzner's simplified process for installing Linux on this server

### Installing and configuring

After going through the payment process I received an email containing the following information:

```
IPv4 Address:	78.46.174.158
IPv6 Address:	2a01:4f8:190:539a::2
Username:	root
Password:	b2fdbCW4Msfkki
Host key:	hHm0rbOZpc0dfrujJrs1Ry3nnc2oaKSto05kFmzj4h8 (DSA 1024)
qSt2t9EVp7z5ehrJMiSuSHKQ5/1rXL6wzy/I3Su9k8c (ECDSA 256)
qdLfInM7MxtFxr5KNQe8s9qywkVdrvsLUWGzbb0rQQ8 (ED25519 256)
CbqGZzPfRnIXE4o8ErsN+2Q4PXSIu9TGMOubpxf66rA (RSA 3072)
```
With this information, we can now log into the server. Using either Putty or a terminal of some sorts, we log into the server with the command: `$ ssh root@78.46.174.158`. It will prompt for the password, so we can copy that in.

After we do so, we're greeted by Hetzner's Rescue System

<figure>
<img src="/hetzner-installing-linux/rescue.png" alt="Hetzner rescue system">
<figcaption>Hetzner's rescue system when logging into the box with ssh</figcaption>
</figure>

It immediately shows a summary of the system's specs, so the storage, cpu, memory.

From here on, we'll start up Hetzner's tool for installing our OS. We do this by running the installimage binary:
`root@rescue ~ # installimage`
Then we are presented a menu in which we're given the option to have our preferred distribution installed. Its also possible to provide your own image, but I've decided to go with Archlinux:
<figure>
<img src="/hetzner-installing-linux/installimage_menu.png" alt="Installimage menu">
<figcaption>The menu for choosing your distribution</figcaption>
</figure>
After selecting Archlinux and proceeding, an <abbr title="Midnight Commander's included editor">mcedit</abbr> is launched with the configuration file.
The configuration file serves the purpose of further configuring the server according to our wishes. There are a few options like setting up LVM for your storage, changing the bootloader, etc... In this case we will only make the changes outlined below.

We'll be setting up RAID-0. The RAID settings are:
```bash
SWRAID 1
SWRAIDLEVEL 1
```
The first line means RAID is already enabled by default, so we won't have to modify this line. We will modify the second line to achieve RAID-0
```
SWRAID 1
SWRAIDLEVEL 0
```
Next, we'll set up the partitioning and make the following changes:
```
PART swap swap 16G
PART /boot ext3 512M
PART / ext4 1024G
PART /home ext4 all
```
to
```
PART swap swap 8G
PART /boot ext3 1G
PART / ext4 all
```
In this change I have set up a swapfile of 8g, allocated 1GB to the <abbr title="Filesystem">ext3</abbr> boot partition and allocated the rest of the space to the root filesystem at `/`. Also, no seperate partition for the home folder.

We'll also want to change the system's hostname:
```
HOSTNAME yourhostname
```
After we're done, we may continue by hitting <kbd>F10</kbd> and choosing "Yes" to save the configuration.
We'll be greeted by a warning stating that the data on the drives will be deleted, which is to be expected so we, again, continue by choosing "Yes"

Now the script will set up the system according to the previously selected distribution and configuration we edited. It'll look like this:

```
Hetzner Online GmbH - installimage
 
 Your server will be installed now, this will take some minutes
            You can abort at any time with CTRL+C ...
 
        :  Reading configuration                           done
        :  Loading image file variables                    done
        :  Loading centos specific functions               done
  1/16  :  Deleting partitions                             done
  2/16  :  Test partition size                             done
  3/16  :  Creating partitions and /etc/fstab              done
  4/16  :  Creating software RAID level 0                  done
  5/16  :  Formatting partitions
        :    formatting /dev/md/0 with swap                done
        :    formatting /dev/md/1 with ext3                done
        :    formatting /dev/md/2 with ext4                done
  6/16  :  Mounting partitions                             done
  7/16  :  Sync time via ntp                               done
        :  Importing public key for image validation       done
  8/16  :  Validating image before starting extraction     done
  9/16  :  Extracting image (local)                        done
 10/16  :  Setting up network config                       done
 11/16  :  Executing additional commands
        :    Setting hostname                              done
        :    Generating new SSH keys                       done
        :    Generating mdadm config                       done
        :    Generating ramdisk                            done
        :    Generating ntp config                         done
 12/16  :  Setting up miscellaneous files                  done
 13/16  :  Configuring authentication
        :    Setting root password                         done
        :    Enabling SSH root login with password         done
 14/16  :  Installing bootloader grub                      done
 15/16  :  Running some centos specific functions          done
 16/16  :  Clearing log files                              done
 
                 INSTALLATION COMPLETE
  You can now reboot and log in to your new system with the
same credentials that you used to log into the rescue system.
```
Now we reboot the server and log into it with the same credentials.
Since Hetzner's network is set up with DHCP, theres no need for configuring the connection or whatsoever.

### Proceeding after the installation

Logging in to the server, we'll want to verify the drives have been set up correctly.

```
[root@Archlinux ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
tmpfs			 16G	 0	 16G   0% /tmp
```

```
[root@Archlinux .config]$ lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE  MOUNTPOINTS
sda       8:0    0  3.6T  0 disk
├─sda1    8:1    0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sda2    8:2    0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sda3    8:3    0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sda4    8:4    0    1M  0 part
sdb       8:16   0  3.6T  0 disk
├─sdb1    8:17   0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sdb2    8:18   0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sdb3    8:19   0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sdb4    8:20   0    1M  0 part
```
It's been set up like we've intended it to, the only change I want to make in this case is the way `/tmp` is mounted. It's mounted as <abbr title="Temporary File System">tmpfs</abbr> which stores its contents only until the next boot. I dont want this, so we'll have to make it persistent, which I will achieve by making `/tmp` part of the root filesystem.

```bash
$ systemctl mask tmp.mount
$ reboot
```
Now to verify it has been masked:
```
[root@Archlinux ~]# systemctl status tmp.mount
○ tmp.mount
     Loaded: masked (Reason: Unit tmp.mount is masked.)
     Active: inactive (dead)
```
And we can see `/tmp` has not been initialized with `tmpfs`

```
[root@ArchBoX ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
```

We can now proceed by creating the user account, and setting up SSH.
`useradd -m -G root -S /bin/bash uxodb`
we install sudo and configure <a href="https://www.sudo.ws/docs/man/1.8.15/sudoers.man/" target="_blank" rel="noopener">sudoers</a>: 
`pacman -Syu sudo`
And for sudoers we'll be using the drop-in function by adding a file with the configuration to `/etc/sudoers.d`. The way I'll configure this will prevent me from having to re-authenticate when using sudo.
`echo "uxodb ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/suoders.d/uxodb`

### Creating SSH keys and configuring sshd_config



